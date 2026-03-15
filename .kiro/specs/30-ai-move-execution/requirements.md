# 要件定義書

## はじめに

AIの手の実行ロジックは、投票対局アプリケーションにおいて、集合知側の投票集計・次の一手確定後にAI側の手を自動的に決定・実行する機能である。日次バッチ処理の一環として、集合知の手が盤面に反映された後、AI側の手番であればBedrockを使ってAIの手を決定し、盤面を更新してDynamoDBに保存する。これにより1日1ターンのサイクルで対局が進行する。

ゲームの流れにおける位置づけ:

1. 投票締切（JST 0:00）→ 集計 → 集合知の手を確定・盤面反映
2. AI側の手番であれば、AIが手を決定・実行・盤面反映 ← 本Specの対象
3. 次のターンの候補生成（spec 28）・解説生成（spec 29）

## 用語集

- **AIMoveExecutor**: AI手実行サービス - AI側の手番判定、手の決定、盤面更新、手履歴保存を統括するサービス
- **BedrockService**: Bedrock統合サービス - AWS Bedrock (Nova Pro) を使用したテキスト生成機能を提供する既存サービス（spec 27 で実装済み）
- **GameRepository**: ゲームリポジトリ - DynamoDB からゲームエンティティを取得・更新するリポジトリ（既存）
- **OthelloLogic**: オセロロジック - 盤面解析、合法手算出、手の実行、終了判定を行うモジュール（既存）
- **Board**: 盤面 - 8x8のオセロ盤面の状態を表す2次元配列
- **Position**: 位置 - 盤面上のマス目を表す座標（row: 0-7, col: 0-7）
- **LegalMove**: 合法手 - オセロのルール上、石を置ける位置
- **MoveEntity**: 手エンティティ - DynamoDB に保存される手の記録（PK: `GAME#<gameId>`, SK: `MOVE#<turnNumber>`）
- **GameEntity**: ゲームエンティティ - DynamoDB に保存される対局情報（盤面状態、ターン数、ステータスを含む）
- **BatchProcess**: バッチ処理 - EventBridge Scheduler により日次で実行される Lambda 関数

## 要件

### 要件 1: AI側の手番判定

**ユーザーストーリー:** バッチ処理として、集合知の手が確定した後にAI側の手番かどうかを判定したい。AI側の手番の場合のみAIの手を実行するためである。

#### 受入基準

1. WHEN バッチ処理が開始された時, THE AIMoveExecutor SHALL GameRepository からステータスが "ACTIVE" の全対局を取得する
2. WHEN アクティブな対局が取得された時, THE AIMoveExecutor SHALL 各対局の currentTurn と aiSide から現在の手番がAI側かどうかを判定する
3. WHEN 現在の手番がAI側でない時, THE AIMoveExecutor SHALL 該当対局の処理をスキップし、ログに記録する
4. WHEN アクティブな対局が0件の時, THE AIMoveExecutor SHALL 処理を正常終了する
5. THE AIMoveExecutor SHALL オセロのルールに従い、黒が先手（偶数ターン）、白が後手（奇数ターン）として手番を判定する

### 要件 2: 盤面状態の取得とパース

**ユーザーストーリー:** バッチ処理として、対局の現在の盤面状態を取得・パースしたい。AIに正確な盤面情報を渡して手を決定させるためである。

#### 受入基準

1. WHEN AI側の手番と判定された時, THE AIMoveExecutor SHALL 対局の boardState（JSON文字列）を Board 型にパースする
2. IF boardState のパースに失敗した時, THEN THE AIMoveExecutor SHALL エラーをログに記録し、該当対局の処理をスキップする
3. WHEN 盤面がパースされた時, THE AIMoveExecutor SHALL OthelloLogic の getLegalMoves 関数を使用してAI側の合法手一覧を算出する
4. WHEN AI側の合法手が0件の時, THE AIMoveExecutor SHALL パス処理を行い、手番を集合知側に切り替える

### 要件 3: AIの手の決定

**ユーザーストーリー:** バッチ処理として、AIが盤面を分析して最適な手を決定したい。AIらしい戦略的な手を打つためである。

#### 受入基準

1. WHEN AI側に合法手が存在する時, THE AIMoveExecutor SHALL 盤面状態と合法手一覧を含むプロンプトを構築する
2. THE AIMoveExecutor SHALL 現在の盤面を人間が読める形式（8x8のグリッド表現）でプロンプトに含める
3. THE AIMoveExecutor SHALL 合法手一覧をプロンプトに含める
4. THE AIMoveExecutor SHALL AI側の色（黒または白）をプロンプトに含める
5. THE AIMoveExecutor SHALL 1つの手を選択するよう指示する
6. THE AIMoveExecutor SHALL 選択理由の説明（200文字以内）を要求する
7. THE AIMoveExecutor SHALL JSON形式でのレスポンスを要求する
8. THE AIMoveExecutor SHALL システムプロンプトにオセロの強いプレイヤーとしての役割を設定する

### 要件 4: AIレスポンスのパースとバリデーション

**ユーザーストーリー:** バッチ処理として、AIのレスポンスを安全にパースし検証したい。不正な手が実行されることを防ぐためである。

#### 受入基準

1. WHEN AIからレスポンスを受信した時, THE AIMoveExecutor SHALL レスポンスをJSON形式としてパースする
2. IF JSONパースに失敗した時, THEN THE AIMoveExecutor SHALL エラーをログに記録し、フォールバック処理に移行する
3. THE AIMoveExecutor SHALL AIが選択した position が合法手一覧に含まれることを検証する
4. WHEN position が合法手一覧に含まれない時, THE AIMoveExecutor SHALL フォールバック処理に移行する
5. THE AIMoveExecutor SHALL AIが返した description が200文字以内であることを検証する
6. WHEN description が200文字を超過する時, THE AIMoveExecutor SHALL 200文字で切り詰める
7. FOR ALL 有効なAIレスポンス, パースしてからフォーマットし直してから再度パースした結果は元のレスポンスと等価である（ラウンドトリップ特性）

### 要件 5: フォールバック手の選択

**ユーザーストーリー:** バッチ処理として、AIのレスポンスが不正な場合でも手を実行したい。対局の進行が停止することを防ぐためである。

#### 受入基準

1. WHEN AIレスポンスのパースまたはバリデーションに失敗した時, THE AIMoveExecutor SHALL 合法手一覧の先頭の手をフォールバックとして選択する
2. THE AIMoveExecutor SHALL フォールバック手の description を「AIが自動選択した手です。」に設定する
3. THE AIMoveExecutor SHALL フォールバック処理が発生したことをログに記録する
4. IF BedrockService の呼び出し自体がエラーを返した時, THEN THE AIMoveExecutor SHALL フォールバック手を使用する

### 要件 6: 盤面の更新と手の実行

**ユーザーストーリー:** バッチ処理として、決定した手を盤面に反映し、対局状態を更新したい。対局を正しく進行させるためである。

#### 受入基準

1. WHEN AIの手が決定された時, THE AIMoveExecutor SHALL OthelloLogic の executeMove 関数を使用して盤面に手を反映する
2. THE AIMoveExecutor SHALL 手の実行により反転した石を正しく盤面に反映する
3. THE AIMoveExecutor SHALL 更新後の盤面状態をJSON文字列にシリアライズする
4. THE AIMoveExecutor SHALL GameRepository の updateBoardState メソッドを使用して盤面状態と currentTurn を DynamoDB に保存する
5. THE AIMoveExecutor SHALL currentTurn を1増加させる
6. FOR ALL 有効な盤面更新, シリアライズしてからデシリアライズした盤面は更新後の盤面と等価である（ラウンドトリップ特性）

### 要件 7: 手履歴の保存

**ユーザーストーリー:** バッチ処理として、AIが実行した手を手履歴として保存したい。対局の棋譜を記録するためである。

#### 受入基準

1. WHEN AIの手が盤面に反映された時, THE AIMoveExecutor SHALL MoveEntity を DynamoDB に保存する
2. THE AIMoveExecutor SHALL MoveEntity の PK を `GAME#<gameId>` 形式で設定する
3. THE AIMoveExecutor SHALL MoveEntity の SK を `MOVE#<turnNumber>` 形式で設定する
4. THE AIMoveExecutor SHALL MoveEntity の side をAI側の色（BLACK または WHITE）に設定する
5. THE AIMoveExecutor SHALL MoveEntity の position を "row,col" 形式で設定する
6. THE AIMoveExecutor SHALL MoveEntity の playedBy を "AI" に設定する
7. THE AIMoveExecutor SHALL MoveEntity の candidateId を空文字列に設定する（AIの直接実行のため候補IDは存在しない）
8. IF MoveEntity の保存に失敗した時, THEN THE AIMoveExecutor SHALL エラーをログに記録する

### 要件 8: 対局終了判定

**ユーザーストーリー:** バッチ処理として、AIの手の実行後に対局が終了したかどうかを判定したい。対局の勝敗を正しく記録するためである。

#### 受入基準

1. WHEN AIの手が盤面に反映された時, THE AIMoveExecutor SHALL OthelloLogic の shouldEndGame 関数を使用して対局終了を判定する
2. WHEN 対局が終了と判定された時, THE AIMoveExecutor SHALL 黒と白の石数を比較して勝者を決定する
3. WHEN AI側の石数が多い時, THE AIMoveExecutor SHALL 勝者を "AI" に設定する
4. WHEN 集合知側の石数が多い時, THE AIMoveExecutor SHALL 勝者を "COLLECTIVE" に設定する
5. WHEN 両者の石数が同数の時, THE AIMoveExecutor SHALL 勝者を "DRAW" に設定する
6. WHEN 対局が終了と判定された時, THE AIMoveExecutor SHALL GameRepository の finish メソッドを使用してゲームステータスを "FINISHED" に更新する

### 要件 9: パス処理

**ユーザーストーリー:** バッチ処理として、AI側に合法手がない場合にパス処理を行いたい。オセロのルールに従って対局を正しく進行させるためである。

#### 受入基準

1. WHEN AI側の合法手が0件の時, THE AIMoveExecutor SHALL AI側のパスとして処理する
2. THE AIMoveExecutor SHALL パス処理時に盤面状態を変更しない
3. THE AIMoveExecutor SHALL パス処理をログに記録する
4. WHEN AI側がパスした後, THE AIMoveExecutor SHALL 集合知側にも合法手がないか確認する
5. WHEN 両者とも合法手がない時, THE AIMoveExecutor SHALL 対局終了判定を実行する

### 要件 10: エラーハンドリングと耐障害性

**ユーザーストーリー:** システム運用者として、個別の対局のAI手実行失敗が他の対局に影響しないようにしたい。バッチ処理全体の信頼性を確保するためである。

#### 受入基準

1. WHEN 特定の対局のAI手実行中にエラーが発生した時, THE AIMoveExecutor SHALL エラーをログに記録し、次の対局の処理を継続する
2. THE AIMoveExecutor SHALL 処理結果（成功数、失敗数、スキップ数、パス数）をログに記録する
3. THE AIMoveExecutor SHALL 全対局の処理完了後に処理サマリーを返す
4. IF DynamoDB への書き込みが失敗した時, THEN THE AIMoveExecutor SHALL 該当対局の処理を失敗として記録する

### 要件 11: ログとモニタリング

**ユーザーストーリー:** システム運用者として、AI手実行処理の詳細なログを確認したい。問題の調査と処理状況の把握ができるようにするためである。

#### 受入基準

1. THE AIMoveExecutor SHALL 処理開始時にバッチ処理開始ログを構造化JSON形式で出力する
2. THE AIMoveExecutor SHALL 各対局の処理開始・完了・スキップ・パス・失敗をログに記録する
3. THE AIMoveExecutor SHALL AIへのリクエスト・レスポンスのトークン使用量をログに記録する
4. THE AIMoveExecutor SHALL 実行した手の位置と反転した石の数をログに記録する
5. THE AIMoveExecutor SHALL 処理完了時に処理サマリー（対局数、成功数、失敗数、スキップ数、パス数、終了対局数）をログに出力する

### 要件 12: バッチ処理への統合

**ユーザーストーリー:** 開発者として、AI手実行処理を既存のバッチ処理（batch.ts）に統合したい。日次バッチの一環として投票集計後・候補生成前に自動実行されるようにするためである。

#### 受入基準

1. THE AIMoveExecutor SHALL 既存の batch.ts の handler 関数内で呼び出される
2. THE AIMoveExecutor SHALL 投票集計・次の一手確定処理の後に実行される
3. THE AIMoveExecutor SHALL 候補生成処理（CandidateGenerator）の前に実行される
4. THE AIMoveExecutor SHALL BedrockService のインスタンスを CandidateGenerator および CommentaryGenerator と共有する
5. IF AIMoveExecutor の処理が失敗した時, THEN THE BatchProcess SHALL エラーをログに記録し、後続の候補生成・解説生成処理を継続する
