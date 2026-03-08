# Requirements Document

## Introduction

投票変更APIは、投票対局アプリケーションにおいて、既に投票済みの認証済みユーザーが投票先の候補を変更するためのRESTful APIエンドポイントです。エンドポイントは `PUT /games/:gameId/turns/:turnNumber/votes/me` で、既存の投票APIの `POST /games/:gameId/turns/:turnNumber/votes`（新規投票作成）を補完します。

投票変更時は、DynamoDBのTransactWriteItemsを使用して、投票レコードの更新・旧候補のvoteCount減少・新候補のvoteCount増加をアトミックに実行します。投票変更は既存投票がある前提であり、未投票のユーザーによる変更リクエストは拒否されます。同じ候補への変更も意味がないため拒否されます。

## Glossary

- **API**: Application Programming Interface - アプリケーション間の通信インターフェース
- **Vote**: 投票 - ユーザーが候補に対して行う投票
- **Candidate**: 次の一手候補 - ユーザーが提案する次の手
- **Game**: 対局 - オセロの対局
- **Turn**: ターン - 対局における手番の番号
- **VoteService**: 投票サービス - 投票の作成・変更・検証を担当するサービスレイヤー
- **VoteRepository**: 投票リポジトリ - DynamoDBへの投票データアクセスを担当するレイヤー
- **DynamoDB**: Amazon DynamoDB - AWSのNoSQLデータベースサービス
- **HTTP_Response**: HTTPレスポンス - APIが返すHTTPレスポンス
- **Validation_Error**: バリデーションエラー - 入力値の検証エラー
- **Not_Found_Error**: 404エラー - リソースが見つからないエラー
- **Not_Voted_Error**: 409エラー - まだ投票していないユーザーによる変更リクエストのエラー
- **Same_Candidate_Error**: 400エラー - 同じ候補への変更リクエストのエラー
- **Auth_Middleware**: 認証ミドルウェア - JWTトークンを検証するミドルウェア
- **TransactWriteItems**: DynamoDBのトランザクション書き込み操作

## Requirements

### Requirement 1: 認証の必須化

**User Story:** As a システム管理者, I want 投票変更を認証済みユーザーに限定したい, so that 不正な投票変更を防止できる

#### Acceptance Criteria

1. WHEN 認証トークンが存在しないリクエストを受信した時, THE Auth_Middleware SHALL ステータスコード401を返す
2. WHEN 無効または期限切れの認証トークンを含むリクエストを受信した時, THE Auth_Middleware SHALL ステータスコード401を返す
3. WHEN 有効な認証トークンを含むリクエストを受信した時, THE Auth_Middleware SHALL ユーザーIDをリクエストコンテキストに設定する

### Requirement 2: リクエストバリデーション

**User Story:** As a システム, I want リクエストの入力値を検証したい, so that 不正なデータの処理を防止できる

#### Acceptance Criteria

1. WHEN gameId が UUID v4 形式でない時, THE API SHALL Validation_Error（ステータスコード400）を返す
2. WHEN turnNumber が0以上の整数でない時, THE API SHALL Validation_Error（ステータスコード400）を返す
3. WHEN candidateId が UUID v4 形式でない時, THE API SHALL Validation_Error（ステータスコード400）を返す
4. WHEN candidateId が未指定または空文字列の時, THE API SHALL Validation_Error（ステータスコード400）を返す
5. THE Validation_Error SHALL エラーコード "VALIDATION_ERROR" とエラーメッセージを含む

### Requirement 3: ゲームとターンの存在確認

**User Story:** As a システム, I want 存在しない対局やターンへの投票変更を拒否したい, so that データの整合性を保てる

#### Acceptance Criteria

1. WHEN 指定された gameId の対局が存在しない時, THE API SHALL Not_Found_Error（ステータスコード404）を返す
2. WHEN 指定された turnNumber が対局の currentTurn より大きい時, THE API SHALL Not_Found_Error（ステータスコード404）を返す
3. THE Not_Found_Error SHALL エラーコード "NOT_FOUND" とエラーメッセージを含む

### Requirement 4: ゲーム状態と投票締切の検証

**User Story:** As a システム, I want アクティブでない対局や投票締切後の投票変更を拒否したい, so that ゲームの進行ルールを維持できる

#### Acceptance Criteria

1. WHEN 対局のステータスが "ACTIVE" でない時, THE API SHALL ステータスコード400のエラーを返す
2. WHEN 候補の投票締切（votingDeadline）が現在時刻より前の時, THE API SHALL ステータスコード400のエラーを返す
3. WHEN 候補のステータスが "VOTING" でない時, THE API SHALL ステータスコード400のエラーを返す
4. THE HTTP_Response SHALL エラーコード "VOTING_CLOSED" とエラーメッセージを含む

### Requirement 5: 新しい候補の存在確認

**User Story:** As a システム, I want 存在しない候補への投票変更を拒否したい, so that データの整合性を保てる

#### Acceptance Criteria

1. WHEN 指定された candidateId の候補が該当ターンに存在しない時, THE API SHALL Not_Found_Error（ステータスコード404）を返す
2. THE Not_Found_Error SHALL エラーコード "NOT_FOUND" と候補が見つからない旨のエラーメッセージを含む

### Requirement 6: 既存投票の存在確認

**User Story:** As a システム, I want 未投票のユーザーによる投票変更を拒否したい, so that 投票変更は既存投票がある場合のみ実行できる

#### Acceptance Criteria

1. WHEN 同一ユーザーが同一ターンにまだ投票していない時, THE API SHALL Not_Voted_Error（ステータスコード409）を返す
2. THE Not_Voted_Error SHALL エラーコード "NOT_VOTED" とエラーメッセージを含む

### Requirement 7: 同一候補への変更の拒否

**User Story:** As a システム, I want 同じ候補への投票変更を拒否したい, so that 無意味な変更操作を防止できる

#### Acceptance Criteria

1. WHEN 既存投票の candidateId と変更先の candidateId が同一の時, THE API SHALL Same_Candidate_Error（ステータスコード400）を返す
2. THE Same_Candidate_Error SHALL エラーコード "SAME_CANDIDATE" とエラーメッセージを含む

### Requirement 8: 投票変更のアトミックな永続化

**User Story:** As a ユーザー, I want 投票先の候補を変更したい, so that より良い手に投票し直せる

#### Acceptance Criteria

1. WHEN すべてのバリデーションに合格した時, THE VoteService SHALL DynamoDBの既存投票エンティティを更新する
2. THE VoteService SHALL 投票レコードの更新、旧候補の voteCount 減少、新候補の voteCount 増加を TransactWriteItems でアトミックに実行する
3. WHEN 投票が変更された時, THE VoteRepository SHALL 旧候補の voteCount を正確に1減少させる
4. WHEN 投票が変更された時, THE VoteRepository SHALL 新候補の voteCount を正確に1増加させる
5. THE VoteService SHALL 投票の updatedAt を現在時刻（ISO 8601形式）で更新する

### Requirement 9: 成功レスポンスの形式

**User Story:** As a フロントエンド開発者, I want 一貫したレスポンスフォーマットを受け取りたい, so that データを簡単に処理できる

#### Acceptance Criteria

1. WHEN 投票の変更に成功した時, THE HTTP_Response SHALL ステータスコード200を返す
2. THE HTTP_Response SHALL Content-Type `application/json` を設定する
3. THE HTTP_Response SHALL gameId, turnNumber, userId, candidateId, createdAt, updatedAt のすべてのフィールドを含む
4. THE API SHALL 日時フィールドを ISO 8601 形式で返す

### Requirement 10: エラーレスポンスの一貫性

**User Story:** As a フロントエンド開発者, I want エラーレスポンスが一貫した形式であることを期待したい, so that エラーハンドリングを統一的に実装できる

#### Acceptance Criteria

1. FOR ALL エラーレスポンス, THE API SHALL `{ error: string, message: string }` の構造を持つJSONを返す
2. THE API SHALL エラーの種類に応じた適切なHTTPステータスコードを返す

### Requirement 11: CORS対応

**User Story:** As a フロントエンドアプリケーション, I want クロスオリジンリクエストを実行したい, so that APIにアクセスできる

#### Acceptance Criteria

1. THE API SHALL CORSヘッダーを含むレスポンスを返す
2. THE API SHALL 許可されたオリジンからのリクエストを受け入れる
3. THE API SHALL プリフライトリクエスト（OPTIONS）に対応する
