# 要件定義書

## はじめに

AI候補生成バッチは、日次バッチ処理（JST 0:00 = UTC 15:00）の一部として実行される機能である。投票集計（VoteTallyService）とAI手実行（AIMoveExecutor）の後に、次のターンが集合知側の手番である対局に対して、AI（Amazon Bedrock Nova Pro）を使って次の一手の候補を自動生成し、続けて対局解説を生成する。

現在の `batch.ts` には CandidateGenerator と CommentaryGenerator が統合済みだが、以下の課題がある:

1. CandidateGenerator が集合知側の手番かどうかを判定せずに候補を生成している（AI側の手番の対局にも不要な候補を生成する可能性がある）
2. CandidateGenerator の `generateCandidates()` が try-catch で囲まれておらず、失敗時に後続の CommentaryGenerator が実行されない
3. 対局終了済み（FINISHED）の対局に対する候補生成・解説生成のスキップが CandidateGenerator 内部で暗黙的に処理されている

本 Spec では、これらの課題を修正し、バッチ処理全体の信頼性と正確性を向上させる。

## 用語集

- **Batch_Handler**: EventBridge Scheduler によって JST 0:00 に起動される Lambda 関数（`packages/api/src/batch.ts`）
- **CandidateGenerator**: 次の一手候補生成サービス - 盤面状態の取得、プロンプト構築、AI呼び出し、候補保存を統括するサービス（`packages/api/src/services/candidate-generator/index.ts`）
- **CommentaryGenerator**: 対局解説生成サービス - 盤面状態と手履歴からAIによる解説を生成するサービス（`packages/api/src/services/commentary-generator/index.ts`）
- **VoteTallyService**: 投票締切・集計・次の一手確定を担うサービスクラス
- **AIMoveExecutor**: AI側の手番判定・手の決定・盤面更新を担うサービスクラス
- **BedrockService**: AWS Bedrock (Nova Pro) を使用したテキスト生成機能を提供する既存サービス
- **GameRepository**: DynamoDB の GAME エンティティに対する CRUD 操作を提供するリポジトリ
- **CandidateRepository**: DynamoDB の CANDIDATE エンティティに対する CRUD 操作を提供するリポジトリ
- **Active_Game**: ステータスが `ACTIVE` である対局
- **Collective_Turn**: 集合知側（ユーザー投票）の手番であるターン

## 要件

### 要件 1: 集合知側の手番判定による候補生成フィルタリング

**ユーザーストーリー:** バッチ処理の管理者として、集合知側の手番である対局に対してのみ候補を生成したい。これにより、AI側の手番の対局に不要な候補が生成されることを防ぐ。

#### 受け入れ基準

1. WHEN CandidateGenerator が Active_Game を処理する時、THE CandidateGenerator SHALL 対局の次のターン（currentTurn + 1）が集合知側の手番かどうかを判定する
2. IF 次のターンが AI 側の手番である場合、THEN THE CandidateGenerator SHALL その対局の候補生成をスキップし、スキップ理由をログに記録する
3. THE CandidateGenerator SHALL `game-utils.ts` の `isAITurn` 関数と同等のロジックを使用して手番を判定する（偶数ターン = 黒の手番、奇数ターン = 白の手番）

### 要件 2: batch.ts の CandidateGenerator エラー隔離

**ユーザーストーリー:** バッチ処理の管理者として、CandidateGenerator の処理が失敗しても後続の CommentaryGenerator が実行されるようにしたい。これにより、候補生成の失敗が解説生成に影響しない。

#### 受け入れ基準

1. THE Batch_Handler SHALL CandidateGenerator の `generateCandidates()` 呼び出しを try-catch で囲む
2. IF CandidateGenerator の処理が例外をスローした場合、THEN THE Batch_Handler SHALL エラーをログに記録し、後続の CommentaryGenerator の処理を継続する
3. WHEN CandidateGenerator が正常に完了した時、THE Batch_Handler SHALL 処理サマリーをログに記録する

### 要件 3: バッチ処理の実行順序の保証

**ユーザーストーリー:** バッチ処理の管理者として、各サービスが正しい順序で実行されることを保証したい。これにより、投票集計後の最新盤面に基づいて候補と解説が生成される。

#### 受け入れ基準

1. THE Batch_Handler SHALL VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator の順序で実行する
2. THE Batch_Handler SHALL 各サービスの失敗が後続サービスの実行を妨げないようにする（全サービスが独立して try-catch で囲まれる）
3. WHEN 全サービスの処理が完了した時、THE Batch_Handler SHALL バッチ処理全体の完了ログを出力する

### 要件 4: 対局終了後の候補生成スキップ

**ユーザーストーリー:** バッチ処理の管理者として、VoteTallyService または AIMoveExecutor によって対局が終了（FINISHED）になった場合、その対局の候補生成と解説生成をスキップしたい。これにより、終了済み対局への不要な AI 呼び出しを防ぐ。

#### 受け入れ基準

1. THE CandidateGenerator SHALL GameRepository から Active_Game のみを取得して処理対象とする（FINISHED の対局は取得されない）
2. THE CommentaryGenerator SHALL GameRepository から Active_Game のみを取得して処理対象とする（FINISHED の対局は取得されない）
3. WHEN バッチ処理中に VoteTallyService または AIMoveExecutor が対局を FINISHED に更新した場合、THE CandidateGenerator SHALL その対局を処理対象から自動的に除外する（listByStatus('ACTIVE') で再取得するため）

### 要件 5: 候補生成と解説生成の処理結果サマリー

**ユーザーストーリー:** バッチ処理の管理者として、候補生成と解説生成の処理結果を確認したい。これにより、バッチ処理全体の正常性を監視できる。

#### 受け入れ基準

1. THE Batch_Handler SHALL CandidateGenerator の処理サマリー（対局数、成功数、失敗数、スキップ数、生成候補数）をログに記録する
2. THE Batch_Handler SHALL CommentaryGenerator の処理サマリー（対局数、成功数、失敗数、スキップ数）をログに記録する
3. THE Batch_Handler SHALL 各サービスの処理サマリーを構造化ログ（JSON形式）で出力する

### 要件 6: CandidateGenerator の合法手なし時のスキップ

**ユーザーストーリー:** バッチ処理の管理者として、集合知側に合法手がない対局の候補生成をスキップしたい。これにより、合法手がない状態で不要な AI 呼び出しが行われることを防ぐ。

#### 受け入れ基準

1. WHEN CandidateGenerator が対局を処理する時、THE CandidateGenerator SHALL Othello_Engine の getLegalMoves を使用して集合知側の合法手を確認する
2. IF 集合知側に合法手が存在しない場合、THEN THE CandidateGenerator SHALL その対局の候補生成をスキップし、理由をログに記録する
3. THE CandidateGenerator SHALL 合法手の確認を AI プロンプト構築の前に実行する

### 要件 7: 重複候補の防止

**ユーザーストーリー:** バッチ処理の管理者として、同一ターンに同一ポジションの候補が重複して生成されることを防ぎたい。これにより、候補一覧の一意性を保てる。

#### 受け入れ基準

1. WHEN CandidateGenerator が候補を保存する前に、THE CandidateGenerator SHALL 同一ターンに既存の候補が存在するか確認する
2. IF 同一ターンに同一ポジションの候補が既に存在する場合、THEN THE CandidateGenerator SHALL 該当候補の保存をスキップし、ログに記録する
3. THE CandidateGenerator SHALL ユーザーが既に投稿済みのポジションと重複しない候補のみを保存する

### 要件 8: 候補の投票期限設定

**ユーザーストーリー:** バッチ処理の管理者として、生成された候補に正しい投票期限を設定したい。これにより、ユーザーが翌日の締切まで投票できる。

#### 受け入れ基準

1. THE CandidateGenerator SHALL 生成した候補の votingDeadline を翌日の JST 23:59:59.999 に設定する
2. THE CandidateGenerator SHALL 候補の turnNumber を対局の currentTurn + 1 に設定する
3. THE CandidateGenerator SHALL 候補の createdBy を "AI" に設定する

### 要件 9: 解説の重複生成防止

**ユーザーストーリー:** バッチ処理の管理者として、同一ターンの解説が重複して生成されることを防ぎたい。これにより、解説の一意性を保てる。

#### 受け入れ基準

1. WHEN CommentaryGenerator が対局を処理する時、THE CommentaryGenerator SHALL 対局の currentTurn に対応する解説が既に存在するか確認する
2. IF currentTurn の解説が既に存在する場合、THEN THE CommentaryGenerator SHALL その対局の解説生成をスキップし、ログに記録する
3. THE CommentaryGenerator SHALL 解説が未生成の currentTurn に対してのみ解説を生成する

### 要件 10: エラーハンドリングと耐障害性

**ユーザーストーリー:** システム運用者として、個別の対局の候補生成・解説生成の失敗が他の対局やバッチ全体に影響しないようにしたい。これにより、バッチ処理全体の信頼性を確保できる。

#### 受け入れ基準

1. WHEN CandidateGenerator で特定の対局の処理中にエラーが発生した時、THE CandidateGenerator SHALL エラーをログに記録し、次の対局の処理を継続する
2. WHEN CommentaryGenerator で特定の対局の処理中にエラーが発生した時、THE CommentaryGenerator SHALL エラーをログに記録し、次の対局の処理を継続する
3. IF BedrockService の呼び出しがエラーを返した場合、THEN THE CandidateGenerator SHALL 該当対局の候補生成を失敗として記録する
4. IF BedrockService の呼び出しがエラーを返した場合、THEN THE CommentaryGenerator SHALL 該当対局の解説生成を失敗として記録する
