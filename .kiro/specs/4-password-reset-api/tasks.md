# 実装計画: パスワードリセットAPI

## 概要

投票対局アプリケーションのパスワードリセットAPI機能を実装します。既存のAuth Routerを拡張し、`/auth/password-reset`と`/auth/password-reset/confirm`エンドポイントを追加します。

実装は以下の順序で進めます:

1. バリデーションスキーマの追加（passwordResetRequestSchema、passwordResetConfirmSchema）
2. CognitoServiceの拡張（forgotPassword、confirmForgotPassword）
3. RateLimiterのアクション別設定追加（password-reset、password-reset-confirm）
4. Auth Routerへのパスワードリセットエンドポイント追加
5. テスト（ユニットテスト + プロパティベーステスト）

## タスク

- [x] 1. バリデーションスキーマの追加
  - [x] 1.1 passwordResetRequestSchemaとpasswordResetConfirmSchemaを作成
    - `packages/api/src/lib/validation/auth-schemas.ts`に追加
    - `passwordResetRequestSchema`: email（必須、非空、RFC 5322簡易版の正規表現）
    - `passwordResetConfirmSchema`: email（必須、非空、メール形式）、confirmationCode（必須、非空、6桁数字）、newPassword（必須、非空、パスワードポリシー適合）
    - 確認コードの正規表現: `/^\d{6}$/`
    - 型エクスポート: `PasswordResetRequestInput`、`PasswordResetConfirmInput`
    - 既存の`emailRegex`と`validatePassword`を再利用
    - _要件: 1.2, 1.3, 1.4, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 1.2 バリデーションスキーマのユニットテストを作成
    - `packages/api/src/lib/validation/auth-schemas.test.ts`に追加
    - passwordResetRequestSchema: 有効なemail受け入れ、email欠落/空/無効形式の拒否
    - passwordResetConfirmSchema: 有効なデータ受け入れ、email/confirmationCode/newPassword欠落/空/無効の拒否
    - confirmationCodeが6桁数字でない場合の拒否テスト
    - newPasswordがポリシー不適合の場合の拒否テスト
    - _要件: 1.2, 1.3, 1.4, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 1.3 プロパティテスト: パスワードリセット要求のemail検証
    - `packages/api/src/lib/validation/auth-schemas.property.test.ts`に追加
    - **プロパティ1: パスワードリセット要求のemail検証**
    - **検証: 要件 1.2, 1.3, 1.4**
  - [x] 1.4 プロパティテスト: パスワードリセット確認のフィールド検証
    - `packages/api/src/lib/validation/auth-schemas.property.test.ts`に追加
    - **プロパティ5: パスワードリセット確認のフィールド検証**
    - **検証: 要件 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 2. CognitoServiceの拡張
  - [x] 2.1 forgotPasswordメソッドを追加
    - `packages/api/src/lib/cognito/cognito-service.ts`に追加
    - `ForgotPasswordCommand`を使用してCognitoに確認コード送信を要求
    - `@aws-sdk/client-cognito-identity-provider`から`ForgotPasswordCommand`をインポート
    - _要件: 2.1_
  - [x] 2.2 confirmForgotPasswordメソッドを追加
    - `packages/api/src/lib/cognito/cognito-service.ts`に追加
    - `ConfirmForgotPasswordCommand`を使用してパスワードリセットを実行
    - 引数: email、confirmationCode、newPassword
    - `@aws-sdk/client-cognito-identity-provider`から`ConfirmForgotPasswordCommand`をインポート
    - _要件: 6.1_
  - [x] 2.3 forgotPasswordとconfirmForgotPasswordのユニットテストを作成
    - `packages/api/src/lib/cognito/cognito-service.test.ts`に追加
    - forgotPassword成功ケース
    - forgotPassword失敗ケース（UserNotFoundException）
    - confirmForgotPassword成功ケース
    - confirmForgotPassword失敗ケース（CodeMismatchException、ExpiredCodeException）
    - Cognitoクライアントをモック
    - _要件: 2.1, 2.3, 4.3, 6.1_

- [x] 3. RateLimiterのアクション別設定追加
  - [x] 3.1 password-resetとpassword-reset-confirmのレート制限設定を追加
    - `packages/api/src/lib/rate-limiter.ts`を修正
    - アクション別のmaxRequests設定にpassword-reset=3、password-reset-confirm=5を追加
    - _要件: 7.1, 7.2_
  - [x] 3.2 アクション別レート制限のユニットテストを作成
    - `packages/api/src/lib/rate-limiter.test.ts`に追加
    - password-resetアクションで3リクエスト制限のテスト
    - password-reset-confirmアクションで5リクエスト制限のテスト
    - _要件: 7.1, 7.2_

- [x] 4. チェックポイント - 基礎実装の確認
  - すべてのテストが通過することを確認し、質問があればユーザーに確認してください。

- [x] 5. Auth Routerへのパスワードリセットエンドポイント追加
  - [x] 5.1 パスワードリセット要求エンドポイントを実装
    - `packages/api/src/routes/auth.ts`に`POST /password-reset`を追加
    - Zodバリデーター統合（passwordResetRequestSchema）
    - バリデーションエラーハンドラー（既存のregisterと同一パターン）
    - レート制限チェック（password-reset: 3リクエスト/分）
    - CognitoService.forgotPassword呼び出し
    - UserNotFoundExceptionを吸収して200レスポンスを返す（アカウント列挙防止）
    - UserNotFoundException以外のCognitoエラーは500を返す
    - リクエストログ（maskEmail使用、パスワード非出力）
    - 成功レスポンス（200、message: "Password reset code has been sent"）
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 7.1, 8.1, 8.2, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2_
  - [x] 5.2 パスワードリセット確認エンドポイントを実装
    - `packages/api/src/routes/auth.ts`に`POST /password-reset/confirm`を追加
    - Zodバリデーター統合（passwordResetConfirmSchema）
    - バリデーションエラーハンドラー（既存と同一パターン）
    - レート制限チェック（password-reset-confirm: 5リクエスト/分）
    - CognitoService.confirmForgotPassword呼び出し
    - CodeMismatchException/ExpiredCodeExceptionは400 INVALID_CODEを返す
    - その他のCognitoエラーは500 INTERNAL_ERRORを返す
    - リクエストログ（maskEmail使用、パスワード・確認コード非出力）
    - 成功レスポンス（200、message: "Password has been reset successfully"）
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 7.2, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.3, 10.4_
  - [x] 5.3 エラー判定ヘルパー関数を実装
    - `isUserNotFoundException`関数: UserNotFoundExceptionを判定
    - `isInvalidCodeError`関数: CodeMismatchException、ExpiredCodeExceptionを判定
    - `packages/api/src/routes/auth.ts`内に定義（または共通ユーティリティに配置）
    - _要件: 2.3, 4.3, 8.1_
  - [x] 5.4 パスワードリセット要求エンドポイントのユニットテストを作成
    - `packages/api/src/routes/auth.test.ts`に追加
    - 有効なリクエストの成功テスト（200）
    - バリデーションエラーのテスト（400 VALIDATION_ERROR）
    - ユーザー未存在でも200を返すテスト（アカウント列挙防止）
    - Cognito予期しないエラーのテスト（500 INTERNAL_ERROR）
    - レート制限のテスト（429 RATE_LIMIT_EXCEEDED）
    - ログ記録の検証（マスク済みメール、タイムスタンプ）
    - CognitoServiceとRateLimiterをモック
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 7.1, 7.3, 7.4, 8.1, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2_
  - [x] 5.5 パスワードリセット確認エンドポイントのユニットテストを作成
    - `packages/api/src/routes/auth.test.ts`に追加
    - 有効なリクエストの成功テスト（200）
    - バリデーションエラーのテスト（400 VALIDATION_ERROR）
    - 無効な確認コードのテスト（400 INVALID_CODE）
    - 期限切れ確認コードのテスト（400 INVALID_CODE）
    - Cognito予期しないエラーのテスト（500 INTERNAL_ERROR）
    - レート制限のテスト（429 RATE_LIMIT_EXCEEDED）
    - ログ記録の検証（マスク済みメール、パスワード非出力、確認コード非出力）
    - CognitoServiceとRateLimiterをモック
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.3, 10.4_
  - [x] 5.6 プロパティテスト: パスワードリセット要求の成功レスポンス
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ2: パスワードリセット要求の成功レスポンス**
    - **検証: 要件 2.1, 2.2**
  - [x] 5.7 プロパティテスト: アカウント列挙防止
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ3: アカウント列挙防止**
    - **検証: 要件 2.3, 8.1**
  - [x] 5.8 プロパティテスト: Cognito予期しないエラー時の500レスポンス
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ4: Cognito予期しないエラー時の500レスポンス**
    - **検証: 要件 2.4, 6.3**
  - [x] 5.9 プロパティテスト: 無効/期限切れ確認コードのエラーハンドリング
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ6: 無効/期限切れ確認コードのエラーハンドリング**
    - **検証: 要件 4.3**
  - [x] 5.10 プロパティテスト: パスワードリセット確認の成功レスポンス
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ7: パスワードリセット確認の成功レスポンス**
    - **検証: 要件 6.1, 6.2**
  - [x] 5.11 プロパティテスト: レート制限
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ8: レート制限**
    - **検証: 要件 7.1, 7.2, 7.3, 7.4**
  - [x] 5.12 プロパティテスト: 機密データのログ保護
    - `packages/api/src/routes/auth.property.test.ts`に追加
    - **プロパティ9: 機密データのログ保護**
    - **検証: 要件 8.2, 8.3, 8.4**

- [x] 6. CORS設定の確認
  - [x] 6.1 CORS設定のユニットテストを作成
    - `packages/api/src/routes/auth.test.ts`に追加
    - パスワードリセットエンドポイントがCORSヘッダーを返すことを確認
    - 許可オリジン: localhost:3000、stg.vote-board-game.example.com、vote-board-game.example.com
    - POSTメソッドとContent-Typeヘッダーの許可を確認
    - _要件: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 7. 最終チェックポイント
  - すべてのテストが通過することを確認し、質問があればユーザーに確認してください。

## 注意事項

- 既存のユーザー登録API・ログインAPIのパターン（Hono、Zod、AWS SDK v3）に従います
- CognitoServiceとRateLimiterは既存クラスを拡張します（新規クラスは作成しない）
- バリデーションエラーハンドラーは登録/ログイン/パスワードリセットで共通パターンを使用します
- パスワードリセット要求はDynamoDBアクセス不要（Cognitoのみで完結）
- `*`マーク付きタスクはオプションでスキップ可能です
- 各タスクは具体的な要件を参照しトレーサビリティを確保しています
- プロパティテストは普遍的な正確性プロパティを検証します
- ユニットテストは特定の例とエッジケースを検証します
