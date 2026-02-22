# 実装計画: ログインAPI

## 概要

投票ボードゲームアプリケーションのログインAPI機能を実装します。既存のユーザー登録APIのアーキテクチャを拡張し、`/auth/login`と`/auth/refresh`エンドポイントを追加します。

実装は以下の順序で進めます:

1. バリデーションスキーマの追加
2. CognitoServiceの拡張（refreshTokens、extractUserIdFromIdToken）
3. RateLimiterのアクション別設定対応
4. Auth Routerへのログイン/リフレッシュエンドポイント追加
5. テスト（ユニットテスト + プロパティベーステスト）

## タスク

- [x] 1. バリデーションスキーマの追加
  - [x] 1.1 loginSchemaとrefreshSchemaを作成
    - `packages/api/src/lib/validation/auth-schemas.ts`に追加
    - `loginSchema`: email（必須、非空）、password（必須、非空）
    - `refreshSchema`: refreshToken（必須、非空）
    - 型エクスポート: `LoginInput`、`RefreshInput`
    - _要件: 1.2, 1.3, 1.4, 5.2_
  - [x] 1.2 loginSchemaとrefreshSchemaのユニットテストを作成
    - `packages/api/src/lib/validation/auth-schemas.test.ts`に追加
    - 有効なデータの受け入れテスト
    - email欠落/空のテスト
    - password欠落/空のテスト
    - refreshToken欠落/空のテスト
    - _要件: 1.2, 1.3, 1.4, 5.2_
  - [x] 1.3 プロパティテスト: ログイン必須フィールド検証
    - `packages/api/src/lib/validation/auth-schemas.property.test.ts`に追加
    - **プロパティ1: ログイン必須フィールド検証**
    - **検証: 要件 1.2, 1.3, 1.4**
  - [x] 1.4 プロパティテスト: リフレッシュトークンバリデーション
    - `packages/api/src/lib/validation/auth-schemas.property.test.ts`に追加
    - **プロパティ4: リフレッシュトークンバリデーション**
    - **検証: 要件 5.2**

- [x] 2. CognitoServiceの拡張
  - [x] 2.1 refreshTokensメソッドを追加
    - `packages/api/src/lib/cognito/cognito-service.ts`に追加
    - `REFRESH_TOKEN_AUTH`フローを使用
    - `RefreshResult`インターフェースを定義（accessToken、idToken、expiresIn）
    - _要件: 5.3_
  - [x] 2.2 extractUserIdFromIdTokenメソッドを追加
    - `packages/api/src/lib/cognito/cognito-service.ts`に追加
    - IDトークンのペイロードからsubクレームを抽出
    - Base64デコードでJWTペイロードを解析
    - _要件: 3.1_
  - [x] 2.3 refreshTokensとextractUserIdFromIdTokenのユニットテストを作成
    - `packages/api/src/lib/cognito/cognito-service.test.ts`に追加
    - refreshTokens成功ケース
    - refreshTokens失敗ケース（NotAuthorizedException）
    - extractUserIdFromIdToken正常ケース
    - Cognitoクライアントをモック
    - _要件: 3.1, 5.3, 5.5_
  - [x] 2.4 プロパティテスト: トークンリフレッシュ成功レスポンス形式
    - `packages/api/src/lib/cognito/cognito-service.property.test.ts`に追加
    - **プロパティ5: トークンリフレッシュ成功レスポンス形式**
    - **検証: 要件 5.3, 5.4**
  - [x] 2.5 プロパティテスト: 無効なリフレッシュトークンのエラーハンドリング
    - `packages/api/src/lib/cognito/cognito-service.property.test.ts`に追加
    - **プロパティ6: 無効なリフレッシュトークンのエラーハンドリング**
    - **検証: 要件 5.5**

- [x] 3. RateLimiterのアクション別設定対応
  - [x] 3.1 アクション別のレート制限設定を追加
    - `packages/api/src/lib/rate-limiter.ts`を修正
    - アクション別のmaxRequests設定: register=5、login=10、refresh=20
    - _要件: 6.1, 6.2_
  - [x] 3.2 アクション別レート制限のユニットテストを作成
    - `packages/api/src/lib/rate-limiter.test.ts`に追加
    - loginアクションで10リクエスト制限のテスト
    - refreshアクションで20リクエスト制限のテスト
    - _要件: 6.1, 6.2_

- [x] 4. チェックポイント - 基礎実装の確認
  - すべてのテストが通過することを確認し、質問があればユーザーに確認してください。

- [ ] 5. Auth Routerへのエンドポイント追加
  - [x] 5.1 ログインエンドポイントを実装
    - `packages/api/src/routes/auth.ts`に`POST /login`を追加
    - Zodバリデーター統合（loginSchema）
    - レート制限チェック（login: 10リクエスト/分）
    - Cognito認証（USER_PASSWORD_AUTH）
    - IDトークンからuserIdを抽出
    - DynamoDBからユーザー情報を取得
    - 成功レスポンス（200、userId、email、username、tokens、expiresIn: 900）
    - リクエストログ（マスク済みメール、IPアドレス、タイムスタンプ）
    - _要件: 1.1, 1.2-1.4, 2.1-2.4, 3.1-3.3, 4.1-4.4, 8.1-8.4, 9.1-9.3_
  - [x] 5.2 リフレッシュエンドポイントを実装
    - `packages/api/src/routes/auth.ts`に`POST /refresh`を追加
    - Zodバリデーター統合（refreshSchema）
    - レート制限チェック（refresh: 20リクエスト/分）
    - Cognitoリフレッシュ（REFRESH_TOKEN_AUTH）
    - 成功レスポンス（200、accessToken、expiresIn: 900）
    - _要件: 5.1, 5.2-5.5, 6.2_
  - [x] 5.3 エラーハンドリングヘルパー関数を実装
    - `isAuthenticationError`関数: NotAuthorizedException、UserNotFoundExceptionを判定
    - `isTokenExpiredError`関数: NotAuthorizedException（リフレッシュフロー）を判定
    - バリデーションエラーハンドラーの共通化（register/login/refreshで共有）
    - _要件: 2.3, 2.4, 5.5, 7.1-7.4, 8.1_
  - [~] 5.4 ログインエンドポイントのユニットテストを作成
    - `packages/api/src/routes/auth.test.ts`に追加
    - 有効なリクエストの成功テスト（200）
    - バリデーションエラーのテスト（400）
    - 認証失敗のテスト（401 AUTHENTICATION_FAILED）
    - ユーザー未存在のテスト（404 USER_NOT_FOUND）
    - Cognito予期しないエラーのテスト（500）
    - レート制限のテスト（429）
    - ログ記録の検証（マスク済みメール、パスワード非出力、トークン非出力）
    - サービスをモック
    - _要件: 1.1-1.4, 2.1-2.4, 3.1-3.3, 4.1-4.4, 6.1, 6.3, 6.4, 7.1-7.4, 8.1-8.4, 9.1-9.3_
  - [~] 5.5 リフレッシュエンドポイントのユニットテストを作成
    - `packages/api/src/routes/auth.test.ts`に追加
    - 有効なリクエストの成功テスト（200）
    - バリデーションエラーのテスト（400）
    - トークン期限切れのテスト（401 TOKEN_EXPIRED）
    - Cognito予期しないエラーのテスト（500）
    - レート制限のテスト（429）
    - サービスをモック
    - _要件: 5.1-5.5, 6.2-6.4_
  - [~] 5.6 プロパティテスト: ログイン成功レスポンス形式
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ2: ログイン成功レスポンス形式**
    - **検証: 要件 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4**
  - [~] 5.7 プロパティテスト: 認証失敗時の統一エラーメッセージ
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ3: 認証失敗時の統一エラーメッセージ**
    - **検証: 要件 2.3, 8.1**
  - [~] 5.8 プロパティテスト: レート制限
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ7: レート制限**
    - **検証: 要件 6.1, 6.2, 6.3, 6.4**
  - [~] 5.9 プロパティテスト: エラーレスポンス形式の一貫性
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ8: エラーレスポンス形式の一貫性**
    - **検証: 要件 7.1, 7.2, 7.3, 7.4**

- [ ] 6. 統合テスト
  - [~] 6.1 ログインフローの統合テストを作成
    - `packages/api/src/routes/auth.integration.test.ts`に追加
    - ログイン成功フロー（バリデーション→レート制限→認証→ユーザー取得→レスポンス）
    - ログイン失敗フロー（認証失敗、ユーザー未存在）
    - サービスをモック（Cognito、DynamoDB）
    - _要件: 1.1-1.4, 2.1-2.4, 3.1-3.3, 4.1-4.4_
  - [~] 6.2 リフレッシュフローの統合テストを作成
    - `packages/api/src/routes/auth.integration.test.ts`に追加
    - リフレッシュ成功フロー
    - リフレッシュ失敗フロー（トークン期限切れ）
    - サービスをモック
    - _要件: 5.1-5.5_

- [ ] 7. 最終チェックポイント
  - すべてのテストが通過することを確認し、質問があればユーザーに確認してください。

## 注意事項

- 既存のユーザー登録APIのパターン（Hono、Zod、AWS SDK v3）に従います
- CognitoServiceとRateLimiterは既存クラスを拡張します（新規クラスは作成しない）
- バリデーションエラーハンドラーは登録/ログイン/リフレッシュで共通化します
- プロパティテストは普遍的な正確性プロパティを検証します
- ユニットテストは特定の例とエッジケースを検証します
- すべてのコードは日本語のコメントとログメッセージを使用します
