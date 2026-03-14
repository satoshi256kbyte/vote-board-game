# Requirements Document

## Introduction

次の一手候補生成ロジックは、投票対局アプリケーションの日次バッチ処理の一部として、投票集計後にAI（Bedrock Nova Pro）を使って次のターンの候補を自動生成する機能である。現在の盤面状態とオセロの合法手一覧をAIに渡し、候補（位置 + 200文字以内の説明文）を生成させ、DynamoDBに保存する。

## Glossary

- **CandidateGenerator**: 次の一手候補生成サービス - 盤面状態の取得、プロンプト構築、AI呼び出し、候補保存を統括するサービス
- **BedrockService**: Bedrock統合サービス - AWS Bedrock (Nova Pro) を使用したテキスト生成機能を提供する既存サービス
- **GameRepository**: ゲームリポジトリ - DynamoDBからゲームエンティティを取得・更新するリポジトリ
- **CandidateRepository**: 候補リポジトリ - DynamoDBに候補エンティティを作成・取得するリポジトリ
- **OthelloLogic**: オセロロジック - 盤面解析、合法手算出、手の有効性検証を行うモジュール
- **Board**: 盤面 - 8x8のオセロ盤面の状態を表す2次元配列
- **Position**: 位置 - 盤面上のマス目を表す座標（row: 0-7, col: 0-7）
- **LegalMove**: 合法手 - オセロのルール上、石を置ける位置
- **Candidate**: 候補 - AIまたはユーザーが提案する次の一手（位置と説明文を含む）
- **Prompt**: プロンプト - AIに送信するテキスト入力
- **BatchProcess**: バッチ処理 - EventBridge Schedulerにより日次で実行されるLambda関数

## Requirements

### Requirement 1: アクティブな対局の盤面状態取得

**User Story:** As a バッチ処理, I want アクティブな対局の現在の盤面状態を取得したい, so that AIに正確な盤面情報を渡せる

#### Acceptance Criteria

1. WHEN バッチ処理が開始された時, THE CandidateGenerator SHALL GameRepository からステータスが "ACTIVE" の全対局を取得する
2. WHEN アクティブな対局が取得された時, THE CandidateGenerator SHALL 各対局の boardState（JSON文字列）を Board 型にパースする
3. IF boardState のパースに失敗した時, THEN THE CandidateGenerator SHALL エラーをログに記録し、該当対局の候補生成をスキップする
4. WHEN アクティブな対局が0件の時, THE CandidateGenerator SHALL 処理を正常終了する

### Requirement 2: 合法手一覧の算出

**User Story:** As a バッチ処理, I want 現在の盤面から合法手一覧を算出したい, so that AIに有効な手のみを候補として提案させられる

#### Acceptance Criteria

1. WHEN 盤面状態が取得された時, THE CandidateGenerator SHALL OthelloLogic の getLegalMoves 関数を使用して現在の手番プレイヤーの合法手一覧を算出する
2. WHEN 合法手が0件の時, THE CandidateGenerator SHALL 該当対局の候補生成をスキップし、ログに記録する
3. THE CandidateGenerator SHALL 合法手の Position を "row,col" 形式の文字列に変換する

### Requirement 3: AIプロンプトの構築

**User Story:** As a バッチ処理, I want 盤面状態と合法手を含む構造化されたプロンプトを構築したい, so that AIが正確で有用な候補を生成できる

#### Acceptance Criteria

1. THE CandidateGenerator SHALL 盤面状態を人間が読める形式（8x8のグリッド表現）でプロンプトに含める
2. THE CandidateGenerator SHALL 合法手一覧をプロンプトに含める
3. THE CandidateGenerator SHALL 現在の手番（黒または白）をプロンプトに含める
4. THE CandidateGenerator SHALL 候補数として3つを指定する
5. THE CandidateGenerator SHALL 各候補に200文字以内の説明文を要求する
6. THE CandidateGenerator SHALL JSON形式でのレスポンスを要求する
7. THE CandidateGenerator SHALL システムプロンプトにオセロの専門家としての役割を設定する

### Requirement 4: AIレスポンスのパースとバリデーション

**User Story:** As a バッチ処理, I want AIのレスポンスを安全にパースし検証したい, so that 不正なデータがDynamoDBに保存されることを防げる

#### Acceptance Criteria

1. WHEN AIからレスポンスを受信した時, THE CandidateGenerator SHALL レスポンスをJSON形式としてパースする
2. IF JSONパースに失敗した時, THEN THE CandidateGenerator SHALL エラーをログに記録し、該当対局の候補生成を失敗として扱う
3. THE CandidateGenerator SHALL 各候補の position が合法手一覧に含まれることを検証する
4. WHEN 候補の position が合法手一覧に含まれない時, THE CandidateGenerator SHALL 該当候補を除外し、ログに記録する
5. THE CandidateGenerator SHALL 各候補の description が200文字以内であることを検証する
6. WHEN description が200文字を超過する時, THE CandidateGenerator SHALL 200文字で切り詰める
7. THE CandidateGenerator SHALL パース結果として position（"row,col"形式）と description（文字列）を含むオブジェクトの配列を返す
8. FOR ALL 有効な候補, パースしてからフォーマットし直してから再度パースした結果は元の候補と等価である（ラウンドトリップ特性）

### Requirement 5: 候補のDynamoDB保存

**User Story:** As a バッチ処理, I want 生成された候補をDynamoDBに保存したい, so that ユーザーが次のターンで投票できる

#### Acceptance Criteria

1. WHEN 有効な候補が生成された時, THE CandidateGenerator SHALL CandidateRepository の create メソッドを使用して各候補を保存する
2. THE CandidateGenerator SHALL 候補の createdBy を "AI" に設定する
3. THE CandidateGenerator SHALL 候補の candidateId を UUID v4 形式で生成する
4. THE CandidateGenerator SHALL 候補の votingDeadline を翌日のJST 23:59:59.999 に設定する
5. THE CandidateGenerator SHALL 候補の turnNumber を対局の currentTurn + 1 に設定する
6. WHEN 候補の保存に失敗した時, THE CandidateGenerator SHALL エラーをログに記録する

### Requirement 6: エラーハンドリングと耐障害性

**User Story:** As a システム運用者, I want 個別の対局の候補生成失敗が他の対局に影響しないようにしたい, so that バッチ処理全体の信頼性を確保できる

#### Acceptance Criteria

1. WHEN 特定の対局の候補生成中にエラーが発生した時, THE CandidateGenerator SHALL エラーをログに記録し、次の対局の処理を継続する
2. THE CandidateGenerator SHALL 処理結果（成功数、失敗数、スキップ数）をログに記録する
3. IF BedrockService の呼び出しがエラーを返した時, THEN THE CandidateGenerator SHALL 該当対局の候補生成を失敗として記録する
4. THE CandidateGenerator SHALL 全対局の処理完了後に処理サマリーを返す

### Requirement 7: 重複候補の防止

**User Story:** As a システム, I want 同一ターンに同一ポジションの候補が重複して生成されることを防ぎたい, so that 候補一覧の一意性を保てる

#### Acceptance Criteria

1. WHEN 候補を保存する前に, THE CandidateGenerator SHALL 同一ターンに既存の候補が存在するか確認する
2. WHEN 同一ターンに同一ポジションの候補が既に存在する時, THE CandidateGenerator SHALL 該当候補の保存をスキップし、ログに記録する
3. WHEN ユーザーが既に候補を投稿済みの場合, THE CandidateGenerator SHALL ユーザー投稿済みのポジションと重複しない候補のみを保存する

### Requirement 8: ログとモニタリング

**User Story:** As a システム運用者, I want 候補生成処理の詳細なログを確認したい, so that 問題の調査と処理状況の把握ができる

#### Acceptance Criteria

1. THE CandidateGenerator SHALL 処理開始時にバッチ処理開始ログを出力する
2. THE CandidateGenerator SHALL 各対局の処理開始・完了・失敗をログに記録する
3. THE CandidateGenerator SHALL AIへのリクエスト・レスポンスのトークン使用量をログに記録する
4. THE CandidateGenerator SHALL 処理完了時に処理サマリー（対局数、成功数、失敗数、生成候補数）をログに出力する
