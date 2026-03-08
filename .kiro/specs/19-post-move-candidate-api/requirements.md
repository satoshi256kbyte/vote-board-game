# Requirements Document

## Introduction

候補投稿APIは、投票対局アプリケーションにおいて、認証済みユーザーが特定の対局の特定のターンに対して次の一手の候補を投稿するためのRESTful APIエンドポイントです。ユーザーは投票したい手が候補一覧にない場合、自ら候補を投稿できます。候補には位置情報（"row,col"形式）と200文字以内の説明文を含めます。

## Glossary

- **API**: Application Programming Interface - アプリケーション間の通信インターフェース
- **Candidate**: 次の一手候補 - ユーザーが提案する次の手
- **Game**: 対局 - オセロの対局
- **Turn**: ターン - 対局における手番の番号
- **CandidateService**: 候補サービス - 候補の作成・取得を担当するサービスレイヤー
- **DynamoDB**: Amazon DynamoDB - AWSのNoSQLデータベースサービス
- **HTTP_Response**: HTTPレスポンス - APIが返すHTTPレスポンス
- **Validation_Error**: バリデーションエラー - 入力値の検証エラー
- **Not_Found_Error**: 404エラー - リソースが見つからないエラー
- **Conflict_Error**: 409エラー - リソースの競合エラー
- **Auth_Middleware**: 認証ミドルウェア - JWTトークンを検証するミドルウェア
- **Othello_Logic**: オセロロジック - オセロのルールに基づく手の有効性検証モジュール

## Requirements

### Requirement 1: 認証の必須化

**User Story:** As a システム管理者, I want 候補投稿を認証済みユーザーに限定したい, so that 不正な投稿を防止できる

#### Acceptance Criteria

1. WHEN 認証トークンが存在しないリクエストを受信した時, THE Auth_Middleware SHALL ステータスコード401を返す
2. WHEN 無効または期限切れの認証トークンを含むリクエストを受信した時, THE Auth_Middleware SHALL ステータスコード401を返す
3. WHEN 有効な認証トークンを含むリクエストを受信した時, THE Auth_Middleware SHALL ユーザーIDをリクエストコンテキストに設定する

### Requirement 2: リクエストバリデーション

**User Story:** As a システム, I want リクエストの入力値を検証したい, so that 不正なデータの処理を防止できる

#### Acceptance Criteria

1. WHEN gameId が UUID v4 形式でない時, THE API SHALL Validation_Error（ステータスコード400）を返す
2. WHEN turnNumber が0以上の整数でない時, THE API SHALL Validation_Error（ステータスコード400）を返す
3. WHEN position が "row,col" 形式でない時, THE API SHALL Validation_Error（ステータスコード400）を返す
4. WHEN position の row または col が 0〜7 の範囲外の時, THE API SHALL Validation_Error（ステータスコード400）を返す
5. WHEN description が空文字列の時, THE API SHALL Validation_Error（ステータスコード400）を返す
6. WHEN description が200文字を超過する時, THE API SHALL Validation_Error（ステータスコード400）を返す
7. THE Validation_Error SHALL エラーコード "VALIDATION_ERROR" とエラーメッセージを含む

### Requirement 3: ゲームとターンの存在確認

**User Story:** As a システム, I want 存在しない対局やターンへの投稿を拒否したい, so that データの整合性を保てる

#### Acceptance Criteria

1. WHEN 指定された gameId の対局が存在しない時, THE API SHALL Not_Found_Error（ステータスコード404）を返す
2. WHEN 指定された turnNumber が対局の currentTurn より大きい時, THE API SHALL Not_Found_Error（ステータスコード404）を返す
3. THE Not_Found_Error SHALL エラーコード "NOT_FOUND" とエラーメッセージを含む

### Requirement 4: ゲーム状態と投票締切の検証

**User Story:** As a システム, I want アクティブでない対局や投票締切後の投稿を拒否したい, so that ゲームの進行ルールを維持できる

#### Acceptance Criteria

1. WHEN 対局のステータスが "ACTIVE" でない時, THE API SHALL ステータスコード400のエラーを返す
2. WHEN 既存候補の投票締切（votingDeadline）が現在時刻より前の時, THE API SHALL ステータスコード400のエラーを返す
3. THE HTTP_Response SHALL エラーコード "VOTING_CLOSED" とエラーメッセージを含む

### Requirement 5: オセロルールに基づく手の有効性検証

**User Story:** As a ユーザー, I want オセロのルールに違反する手を投稿できないようにしたい, so that 有効な候補のみが投票対象になる

#### Acceptance Criteria

1. WHEN 指定された位置にオセロのルール上石を置けない時, THE Othello_Logic SHALL 無効と判定する
2. WHEN Othello_Logic が無効と判定した時, THE API SHALL ステータスコード400のエラーを返す
3. THE HTTP_Response SHALL エラーコード "INVALID_MOVE" と無効理由を含むエラーメッセージを返す

### Requirement 6: 同一ポジション重複チェック

**User Story:** As a システム, I want 同じターンに同じ位置の候補が重複して投稿されることを防ぎたい, so that 候補一覧の一意性を保てる

#### Acceptance Criteria

1. WHEN 同じターンに同じ position の候補が既に存在する時, THE API SHALL Conflict_Error（ステータスコード409）を返す
2. THE Conflict_Error SHALL エラーコード "CONFLICT" と重複ポジションを含むエラーメッセージを返す

### Requirement 7: 候補の作成と永続化

**User Story:** As a ユーザー, I want 次の一手の候補を投稿したい, so that 投票対象に自分の提案を追加できる

#### Acceptance Criteria

1. WHEN すべてのバリデーションに合格した時, THE CandidateService SHALL DynamoDBに新しい候補エンティティを作成する
2. THE CandidateService SHALL 候補の voteCount を 0 に設定する
3. THE CandidateService SHALL 候補の status を "VOTING" に設定する
4. THE CandidateService SHALL 候補の createdBy を "USER#<userId>" 形式で設定する
5. THE CandidateService SHALL 候補の candidateId を UUID v4 形式で生成する
6. WHEN 既存候補が存在する時, THE CandidateService SHALL 既存候補の votingDeadline を使用する
7. WHEN 既存候補が存在しない時, THE CandidateService SHALL 当日のJST 23:59:59.999 を votingDeadline として設定する

### Requirement 8: 成功レスポンスの形式

**User Story:** As a フロントエンド開発者, I want 一貫したレスポンスフォーマットを受け取りたい, so that データを簡単に処理できる

#### Acceptance Criteria

1. WHEN 候補の作成に成功した時, THE HTTP_Response SHALL ステータスコード201を返す
2. THE HTTP_Response SHALL Content-Type `application/json` を設定する
3. THE HTTP_Response SHALL candidateId, gameId, turnNumber, position, description, voteCount, createdBy, status, votingDeadline, createdAt のすべてのフィールドを含む
4. THE API SHALL 日時フィールドを ISO 8601 形式で返す

### Requirement 9: エラーレスポンスの一貫性

**User Story:** As a フロントエンド開発者, I want エラーレスポンスが一貫した形式であることを期待したい, so that エラーハンドリングを統一的に実装できる

#### Acceptance Criteria

1. FOR ALL エラーレスポンス, THE API SHALL `{ error: string, message: string }` の構造を持つJSONを返す
2. THE API SHALL エラーの種類に応じた適切なHTTPステータスコードを返す

### Requirement 10: CORS対応

**User Story:** As a フロントエンドアプリケーション, I want クロスオリジンリクエストを実行したい, so that APIにアクセスできる

#### Acceptance Criteria

1. THE API SHALL CORSヘッダーを含むレスポンスを返す
2. THE API SHALL 許可されたオリジンからのリクエストを受け入れる
3. THE API SHALL プリフライトリクエスト（OPTIONS）に対応する
