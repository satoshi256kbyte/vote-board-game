# 要件定義書

## はじめに

対局状態更新バッチは、日次バッチ処理（JST 0:00 = UTC 15:00）の最終ステップとして実行される機能である。VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator の全処理完了後に、対局の整合性検証と状態の最終更新を行う。

現在のバッチ処理では、各サービスがエラー隔離パターン（try-catch）で独立して実行されるため、以下の課題がある:

1. VoteTallyService や AIMoveExecutor でパス処理が発生した後、連続パス（両者合法手なし）による対局終了が検出されない場合がある
2. バッチ処理中に一部サービスが失敗した場合、対局が不整合な状態（候補なし・解説なし等）のまま翌日の投票サイクルに入る可能性がある
3. 対局の次の投票サイクルへの準備状態（候補が生成済みか、投票可能か）を一元的に検証する仕組みがない

本 Spec では、バッチ処理の最終ステップとして GameStateUpdater サービスを追加し、対局状態の整合性検証・連続パス検出・次サイクル準備状態の確認を実装する。

## 用語集

- **Batch_Handler**: EventBridge Scheduler によって JST 0:00 に起動される Lambda 関数（`packages/api/src/batch.ts`）
- **GameStateUpdater**: バッチ処理の最終ステップとして対局状態の整合性検証と最終更新を担うサービスクラス
- **Game_Repository**: DynamoDB の GAME エンティティに対する CRUD 操作を提供するリポジトリ
- **Candidate_Repository**: DynamoDB の CANDIDATE エンティティに対する CRUD 操作を提供するリポジトリ
- **Othello_Engine**: オセロのゲームロジック（合法手判定、盤面更新、終了判定）を提供するモジュール（`packages/api/src/lib/othello`）
- **Active_Game**: ステータスが `ACTIVE` である対局
- **Consecutive_Pass**: 集合知側とAI側の両方が合法手を持たない状態（連続パス）
- **Voting_Cycle**: 1日1回の投票→集計→次の一手決定→候補生成のサイクル
- **Next_Cycle_Ready**: 次の Voting_Cycle に必要な候補が生成済みで、投票可能な状態

## 要件

### 要件 1: 連続パスによる対局終了検出

**ユーザーストーリー:** バッチ処理の管理者として、バッチ処理中のパス処理後に両者とも合法手がない状態を検出し、対局を正しく終了させたい。これにより、終了すべき対局が ACTIVE のまま残ることを防ぐ。

#### 受け入れ基準

1. WHEN GameStateUpdater が Active_Game を処理する時、THE GameStateUpdater SHALL 盤面状態をパースし、Othello_Engine の getLegalMoves を使用して両者の合法手を確認する
2. IF 集合知側と AI 側の両方に合法手が存在しない場合（Consecutive_Pass）、THEN THE GameStateUpdater SHALL Othello_Engine の countDiscs を使用して石数を数え、勝者を決定する
3. IF Consecutive_Pass が検出された場合、THEN THE GameStateUpdater SHALL Game_Repository の finish を使用して対局ステータスを `FINISHED` に更新し、勝者（`AI`、`COLLECTIVE`、`DRAW`）を記録する
4. WHEN 対局が終了した時、THE GameStateUpdater SHALL 終了結果（勝者、黒石数、白石数）を構造化ログ（JSON形式）で記録する

### 要件 2: 次の投票サイクル準備状態の検証

**ユーザーストーリー:** バッチ処理の管理者として、バッチ処理完了後に各対局が翌日の投票サイクルに必要な状態になっているか検証したい。これにより、候補が生成されていない対局を早期に検出できる。

#### 受け入れ基準

1. WHEN GameStateUpdater が Active_Game を処理する時、THE GameStateUpdater SHALL 対局の次のターン（currentTurn）に対する候補が存在するか Candidate_Repository を使用して確認する
2. IF 次のターンの候補が 0 件の場合、THEN THE GameStateUpdater SHALL 警告ログを構造化ログ（JSON形式）で出力する（type: `GAME_STATE_NO_CANDIDATES_WARNING`）
3. THE GameStateUpdater SHALL 候補の存在確認結果を処理サマリーに含める（候補あり対局数、候補なし対局数）

### 要件 3: 盤面状態の整合性検証

**ユーザーストーリー:** バッチ処理の管理者として、バッチ処理完了後に各対局の盤面状態が有効であることを検証したい。これにより、不正な盤面状態の対局を早期に検出できる。

#### 受け入れ基準

1. WHEN GameStateUpdater が Active_Game を処理する時、THE GameStateUpdater SHALL boardState が有効な JSON であり、8x8 の盤面配列を含むことを検証する
2. IF boardState のパースに失敗した場合、THEN THE GameStateUpdater SHALL エラーログを構造化ログ（JSON形式）で出力する（type: `GAME_STATE_INVALID_BOARD_ERROR`）
3. THE GameStateUpdater SHALL 盤面検証結果を処理サマリーに含める（有効対局数、無効対局数）

### 要件 4: 処理結果サマリーの出力

**ユーザーストーリー:** バッチ処理の管理者として、対局状態更新バッチの処理結果を確認したい。これにより、バッチ処理全体の正常性を監視できる。

#### 受け入れ基準

1. THE GameStateUpdater SHALL 処理結果のサマリーを返却する（処理対局数、正常数、終了数、警告数、エラー数）
2. WHEN 各対局の処理が完了した時、THE GameStateUpdater SHALL 構造化ログ（JSON形式）で処理結果を出力する
3. THE Batch_Handler SHALL GameStateUpdater の処理結果サマリーをログに記録する（type: `BATCH_GAME_STATE_UPDATE_COMPLETED`）

### 要件 5: batch.ts ハンドラーへの統合

**ユーザーストーリー:** バッチ処理の管理者として、対局状態更新処理を既存のバッチハンドラーの最終ステップとして統合したい。これにより、全サービスの処理完了後に対局状態の最終検証が自動的に行われる。

#### 受け入れ基準

1. THE Batch_Handler SHALL GameStateUpdater を CommentaryGenerator の後（バッチ処理の最終ステップ）に実行する
2. IF GameStateUpdater の処理が失敗した場合、THEN THE Batch_Handler SHALL エラーをログに記録する（バッチ全体の最終ステップのため後続処理はない）
3. THE Batch_Handler SHALL GameStateUpdater の初期化を Lambda 実行環境のコールドスタート時に1度だけ行う
4. THE Batch_Handler SHALL 実行順序を VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator → GameStateUpdater とする

### 要件 6: エラーハンドリングと耐障害性

**ユーザーストーリー:** システム運用者として、個別の対局の状態更新処理の失敗が他の対局やバッチ全体に影響しないようにしたい。これにより、バッチ処理全体の信頼性を確保できる。

#### 受け入れ基準

1. WHEN GameStateUpdater で特定の対局の処理中にエラーが発生した時、THE GameStateUpdater SHALL エラーをログに記録し、次の対局の処理を継続する
2. IF Game_Repository の finish 処理が失敗した場合、THEN THE GameStateUpdater SHALL エラーをログに記録し、その対局を失敗として処理サマリーに含める
3. THE GameStateUpdater SHALL 全対局の処理完了後にサマリーを返却する（一部失敗があっても全体は正常終了とする）

### 要件 7: 手番に応じた検証のスキップ

**ユーザーストーリー:** バッチ処理の管理者として、AI 側の手番である対局の候補存在チェックをスキップしたい。これにより、AI の手番では候補が不要であることを正しく反映する。

#### 受け入れ基準

1. WHEN Active_Game の currentTurn が AI 側の手番である時、THE GameStateUpdater SHALL 候補存在チェック（要件 2）をスキップする
2. WHEN 候補存在チェックがスキップされた時、THE GameStateUpdater SHALL スキップ理由（AI ターン）をログに記録する
3. THE GameStateUpdater SHALL AI ターンの対局でも盤面整合性検証（要件 3）と連続パス検出（要件 1）は実行する
