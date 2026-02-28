# Requirements Document

## Introduction

次の一手候補一覧取得APIは、投票対局において、特定の対局の特定のターンに対する次の一手候補の一覧を取得するためのRESTful APIエンドポイントです。このAPIは、ユーザーが投票可能な候補を閲覧するために使用され、認証の有無に関わらずアクセス可能です。

## Glossary

- **API**: Application Programming Interface - アプリケーション間の通信インターフェース
- **Candidate**: 次の一手候補 - ユーザーまたはAIが提案する次の手
- **Game**: 対局 - オセロの対局
- **Turn**: ターン - 対局における手番の番号
- **DynamoDB**: Amazon DynamoDB - AWSのNoSQLデータベースサービス
- **HTTP_Response**: HTTPレスポンス - APIが返すHTTPレスポンス
- **Query_Operation**: DynamoDBのクエリ操作
- **Validation_Error**: バリデーションエラー - 入力値の検証エラー
- **Not_Found_Error**: 404エラー - リソースが見つからないエラー

## Requirements

### Requirement 1: 候補一覧の取得

**User Story:** As a ユーザー, I want 特定の対局の特定のターンの候補一覧を取得したい, so that 投票可能な次の一手を確認できる

#### Acceptance Criteria

1. WHEN `GET /games/:gameId/turns/:turnNumber/candidates` リクエストを受信した時, THE API SHALL DynamoDBから候補一覧を取得する
2. THE API SHALL 取得した候補を投票数の降順でソートする
3. THE API SHALL 候補一覧をJSON形式でレスポンスとして返す
4. THE HTTP_Response SHALL ステータスコード200を返す
5. THE HTTP_Response SHALL 各候補の candidateId, position, description, voteCount, createdBy, status, votingDeadline, createdAt を含む

### Requirement 2: パスパラメータのバリデーション

**User Story:** As a システム, I want パスパラメータを検証したい, so that 不正なリクエストを拒否できる

#### Acceptance Criteria

1. WHEN gameId が UUID 形式でない時, THE API SHALL Validation_Error を返す
2. WHEN turnNumber が正の整数でない時, THE API SHALL Validation_Error を返す
3. THE Validation_Error SHALL ステータスコード400を返す
4. THE Validation_Error SHALL エラーメッセージを含む

### Requirement 3: 存在しない対局またはターンの処理

**User Story:** As a システム, I want 存在しない対局やターンへのリクエストを適切に処理したい, so that ユーザーに明確なエラーを返せる

#### Acceptance Criteria

1. WHEN 指定された gameId の対局が存在しない時, THE API SHALL Not_Found_Error を返す
2. WHEN 指定された turnNumber のターンが存在しない時, THE API SHALL Not_Found_Error を返す
3. THE Not_Found_Error SHALL ステータスコード404を返す
4. THE Not_Found_Error SHALL エラーメッセージを含む

### Requirement 4: 空の候補一覧の処理

**User Story:** As a システム, I want 候補が存在しない場合でも正常にレスポンスを返したい, so that クライアントが一貫した形式でレスポンスを処理できる

#### Acceptance Criteria

1. WHEN 指定されたターンに候補が存在しない時, THE API SHALL 空の配列を返す
2. THE HTTP_Response SHALL ステータスコード200を返す
3. THE HTTP_Response SHALL `{"candidates": []}` の形式を保つ

### Requirement 5: DynamoDBクエリの実行

**User Story:** As a システム, I want DynamoDBから効率的にデータを取得したい, so that レスポンス時間を最小化できる

#### Acceptance Criteria

1. THE Query_Operation SHALL パーティションキー `GAME#<gameId>#TURN#<turnNumber>` を使用する
2. THE Query_Operation SHALL ソートキーのプレフィックス `CANDIDATE#` で始まるアイテムを取得する
3. THE Query_Operation SHALL 必要な属性のみを取得する（ProjectionExpression使用）
4. WHEN DynamoDBエラーが発生した時, THE API SHALL ステータスコード500のエラーを返す

### Requirement 6: レスポンスフォーマット

**User Story:** As a フロントエンド開発者, I want 一貫したレスポンスフォーマットを受け取りたい, so that データを簡単に処理できる

#### Acceptance Criteria

1. THE HTTP_Response SHALL Content-Type `application/json` を設定する
2. THE HTTP_Response SHALL 以下の構造を持つ: `{"candidates": [...]}`
3. FOR ALL 候補オブジェクト, THE API SHALL 以下のフィールドを含む: candidateId, position, description, voteCount, createdBy, status, votingDeadline, createdAt
4. THE API SHALL ISO 8601形式で日時を返す

### Requirement 7: CORS対応

**User Story:** As a フロントエンドアプリケーション, I want クロスオリジンリクエストを実行したい, so that APIにアクセスできる

#### Acceptance Criteria

1. THE API SHALL CORSヘッダーを含むレスポンスを返す
2. THE API SHALL 許可されたオリジンからのリクエストを受け入れる
3. THE API SHALL プリフライトリクエスト（OPTIONS）に対応する

### Requirement 8: 認証不要のアクセス

**User Story:** As a 未認証ユーザー, I want 認証なしで候補一覧を閲覧したい, so that 投票前に候補を確認できる

#### Acceptance Criteria

1. THE API SHALL 認証トークンなしでリクエストを受け入れる
2. THE API SHALL 認証済みユーザーと未認証ユーザーに同じデータを返す
3. THE API SHALL 認証状態に関わらず同じレスポンス形式を返す
