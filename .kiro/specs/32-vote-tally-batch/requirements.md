# 要件定義書

## はじめに

投票締切・集計バッチは、日次バッチ処理（JST 0:00 = UTC 15:00）の一部として実行される機能である。アクティブな対局の現在ターンに対する投票を締め切り、投票結果を集計し、最多得票の候補を次の一手として確定する。確定した手を盤面に適用し、対局状態を更新する。現在の `batch.ts` ハンドラーには TODO として投票集計処理と次の一手決定処理が残されており、本 Spec でこれらを実装する。

## 用語集

- **Batch_Handler**: EventBridge Scheduler によって JST 0:00 に起動される Lambda 関数（`packages/api/src/batch.ts`）
- **Vote_Tally_Service**: 投票締切・集計・次の一手確定を担うサービスクラス
- **Game_Repository**: DynamoDB の GAME エンティティに対する CRUD 操作を提供するリポジトリ
- **Candidate_Repository**: DynamoDB の CANDIDATE エンティティに対する CRUD 操作を提供するリポジトリ
- **Vote_Repository**: DynamoDB の VOTE エンティティに対する CRUD 操作を提供するリポジトリ
- **Move_Repository**: DynamoDB の MOVE エンティティに対する CRUD 操作を提供するリポジトリ
- **Othello_Engine**: オセロのゲームロジック（合法手判定、盤面更新、終了判定）を提供するモジュール（`packages/api/src/lib/othello`）
- **Active_Game**: ステータスが `ACTIVE` である対局
- **Current_Turn**: 対局の `currentTurn` フィールドが示す現在のターン番号
- **Voting_Candidate**: ステータスが `VOTING` である候補
- **Adopted_Candidate**: 最多得票により採用された候補（ステータスが `ADOPTED`）
- **Collective_Move**: 集合知側（ユーザー投票）によって決定された手

## 要件

### 要件 1: アクティブな対局の投票締切処理

**ユーザーストーリー:** バッチ処理の管理者として、アクティブな全対局の現在ターンの投票を自動的に締め切りたい。これにより、日次の投票サイクルが正しく終了する。

#### 受け入れ基準

1. WHEN Batch_Handler が起動された時、THE Vote_Tally_Service SHALL Game_Repository から全ての Active_Game を取得する
2. WHEN Active_Game が取得された時、THE Vote_Tally_Service SHALL 各 Active_Game の Current_Turn に対する全ての Voting_Candidate のステータスを `CLOSED` に更新する
3. IF Active_Game の Current_Turn に Voting_Candidate が存在しない場合、THEN THE Vote_Tally_Service SHALL その対局をスキップしてログに記録する
4. IF Candidate_Repository の closeVoting 処理が失敗した場合、THEN THE Vote_Tally_Service SHALL エラーをログに記録し、他の対局の処理を継続する

### 要件 2: 投票結果の集計と最多得票候補の決定

**ユーザーストーリー:** バッチ処理の管理者として、締め切った投票の結果を集計し、最多得票の候補を次の一手として確定したい。これにより、集合知による手が決定される。

#### 受け入れ基準

1. WHEN 投票が締め切られた後、THE Vote_Tally_Service SHALL 各 Active_Game の Current_Turn の全候補の voteCount を比較し、最多得票の候補を特定する
2. WHEN 最多得票の候補が特定された時、THE Vote_Tally_Service SHALL Candidate_Repository の markAsAdopted を使用して、その候補のステータスを `ADOPTED` に更新する
3. IF 最多得票の候補が複数存在する場合（同票）、THEN THE Vote_Tally_Service SHALL 最も早く作成された候補（createdAt が最も古い候補）を採用する
4. IF 全ての候補の voteCount が 0 の場合、THEN THE Vote_Tally_Service SHALL 最も早く作成された候補を採用する
5. IF 候補が存在しない場合、THEN THE Vote_Tally_Service SHALL その対局の次の一手確定処理をスキップしてログに記録する

### 要件 3: 確定した手の盤面適用

**ユーザーストーリー:** バッチ処理の管理者として、確定した次の一手を盤面に適用し、対局状態を進めたい。これにより、対局が次のターンに進行する。

#### 受け入れ基準

1. WHEN Adopted_Candidate が決定された時、THE Vote_Tally_Service SHALL Adopted_Candidate の position を Othello_Engine の executeMove に渡して新しい盤面を計算する
2. WHEN 新しい盤面が計算された時、THE Vote_Tally_Service SHALL Move_Repository に Collective_Move レコードを作成する（playedBy は `COLLECTIVE`、candidateId は Adopted_Candidate の candidateId）
3. WHEN Collective_Move レコードが作成された時、THE Vote_Tally_Service SHALL Game_Repository の updateBoardState を使用して盤面状態と currentTurn を更新する（currentTurn は +1 する）
4. IF Adopted_Candidate の position が Othello_Engine で無効な手と判定された場合、THEN THE Vote_Tally_Service SHALL エラーをログに記録し、その対局の盤面更新をスキップする

### 要件 4: 対局終了判定

**ユーザーストーリー:** バッチ処理の管理者として、手の適用後に対局が終了条件を満たしているか判定したい。これにより、終了した対局が正しく完了状態になる。

#### 受け入れ基準

1. WHEN 盤面が更新された後、THE Vote_Tally_Service SHALL Othello_Engine の shouldEndGame を使用して対局終了を判定する
2. IF 対局が終了条件を満たす場合、THEN THE Vote_Tally_Service SHALL Othello_Engine の countDiscs を使用して石数を数え、勝者（`AI`、`COLLECTIVE`、`DRAW`）を決定する
3. IF 対局が終了条件を満たす場合、THEN THE Vote_Tally_Service SHALL Game_Repository の finish を使用して対局ステータスを `FINISHED` に更新する
4. WHEN 対局が終了した時、THE Vote_Tally_Service SHALL 終了結果（勝者、黒石数、白石数）をログに記録する

### 要件 5: 集合知側のパス処理

**ユーザーストーリー:** バッチ処理の管理者として、集合知側に合法手がない場合にパスを正しく処理したい。これにより、オセロのルールに従った対局進行が保証される。

#### 受け入れ基準

1. WHILE Active_Game の Current_Turn が集合知側の手番である時、THE Vote_Tally_Service SHALL Othello_Engine の getLegalMoves を使用して集合知側の合法手を確認する
2. IF 集合知側に合法手が存在しない場合、THEN THE Vote_Tally_Service SHALL 投票集計をスキップし、currentTurn を +1 して次のターンに進める（パス処理）
3. IF 集合知側に合法手が存在せず、かつ AI 側にも合法手が存在しない場合、THEN THE Vote_Tally_Service SHALL 対局終了処理を実行する

### 要件 6: バッチ処理結果のサマリー

**ユーザーストーリー:** バッチ処理の管理者として、投票集計バッチの処理結果を確認したい。これにより、バッチ処理の正常性を監視できる。

#### 受け入れ基準

1. THE Vote_Tally_Service SHALL 処理結果のサマリーを返却する（処理対局数、成功数、失敗数、スキップ数、パス数、終了数）
2. WHEN 各対局の処理が完了した時、THE Vote_Tally_Service SHALL 構造化ログ（JSON形式）で処理結果を出力する
3. THE Batch_Handler SHALL Vote_Tally_Service の処理結果サマリーをログに記録する

### 要件 7: batch.ts ハンドラーへの統合

**ユーザーストーリー:** バッチ処理の管理者として、投票集計処理を既存のバッチハンドラーに統合したい。これにより、EventBridge Scheduler による日次実行で投票集計が自動的に行われる。

#### 受け入れ基準

1. THE Batch_Handler SHALL Vote_Tally_Service を AI 手実行処理（AIMoveExecutor）の前に実行する
2. IF Vote_Tally_Service の処理が失敗した場合、THEN THE Batch_Handler SHALL エラーをログに記録し、後続の処理（AI 手実行、候補生成、解説生成）を継続する
3. THE Batch_Handler SHALL Vote_Tally_Service の初期化を Lambda 実行環境のコールドスタート時に1度だけ行う

### 要件 8: AI ターンのスキップ

**ユーザーストーリー:** バッチ処理の管理者として、AI 側の手番である対局の投票集計をスキップしたい。これにより、集合知側の手番でない対局に対して不要な処理が行われない。

#### 受け入れ基準

1. WHEN Active_Game の Current_Turn が AI 側の手番である時、THE Vote_Tally_Service SHALL その対局の投票集計処理をスキップする
2. WHEN 対局がスキップされた時、THE Vote_Tally_Service SHALL スキップ理由（AI ターン）をログに記録する
