# Authentication E2E Tests

このディレクトリには認証フローのE2Eテストが含まれています。

## テストファイル

### ✅ registration.spec.ts

ユーザー登録フローのテスト。以下のテストケースを含みます:

- **有効なデータでの登録成功**: 有効なメールアドレスとパスワードで登録し、ログインページにリダイレクトされることを検証
- **無効なメールアドレスでの登録失敗**: 無効なメールアドレスでエラーメッセージが表示されることを検証
- **弱いパスワードでの登録失敗**: セキュリティ要件を満たさないパスワードでエラーメッセージが表示されることを検証
- **パスワード不一致での登録失敗**: パスワードと確認パスワードが一致しない場合にエラーメッセージが表示されることを検証
- **パフォーマンステスト**: 登録フローが30秒以内に完了することを検証

**要件カバレッジ**: Requirement 1.1 (Registration with valid data redirects to login page)

### ✅ login.spec.ts

ログインフローのテスト。以下のテストケースを含みます:

- **有効な認証情報でのログイン成功**: 有効なメールアドレスとパスワードでログインし、ゲーム一覧ページにリダイレクトされることを検証
- **無効な認証情報でのログイン失敗**: 存在しないユーザーでエラーメッセージが表示されることを検証
- **誤ったパスワードでのログイン失敗**: 正しいメールアドレスだが誤ったパスワードでエラーメッセージが表示されることを検証
- **ログアウト機能**: ログアウトボタンをクリックしてログインページにリダイレクトされることを検証
- **未認証でのゲーム一覧ページアクセス制限**: 未認証でゲーム一覧ページにアクセスしようとするとログインページにリダイレクトされることを検証
- **未認証でのプロフィールページアクセス制限**: 未認証でプロフィールページにアクセスしようとするとログインページにリダイレクトされることを検証
- **パフォーマンステスト**: ログインフローが30秒以内に完了することを検証

**要件カバレッジ**:

- Requirement 1.2 (Login with valid credentials redirects to game list)
- Requirement 1.3 (Logout redirects to login page)
- Requirement 1.4 (Invalid credentials show error message)
- Requirement 1.5 (Unauthenticated access to protected pages redirects to login)

### ⚠️ password-reset.spec.ts

パスワードリセットフローのテスト。**現在スキップされています。**

## テストの実装状況

### ✅ 完了した受け入れ基準

- [x] `e2e/auth/registration.spec.ts`を作成
- [x] 有効なデータでの登録成功テストを実装
- [x] 無効なデータでの登録失敗テストを実装
- [x] 登録後のログインページへのリダイレクトを検証
- [x] `e2e/auth/login.spec.ts`を作成
- [x] 有効な認証情報でのログイン成功テストを実装
- [x] 無効な認証情報でのログイン失敗テストを実装
- [x] ログイン後のゲーム一覧ページへのリダイレクトを検証
- [x] ログアウト機能のテストを実装
- [x] 未認証でのアクセス制限テストを実装
- [x] 各テストケースが30秒以内に完了することを確認

## パスワードリセットテストについて

パスワードリセットテストは、Cognitoから送信される確認コードを取得する必要があるため、現在スキップされています。

### 問題点

Cognitoはパスワードリセット時に確認コードをメールで送信しますが、E2Eテスト環境でこのコードを取得する標準的な方法がありません。

### 実装オプション

このテストを有効にするには、以下のいずれかのアプローチを実装する必要があります:

#### 1. AWS SDK AdminGetUser API を使用

- **メリット**: Cognitoから直接コードを取得できる
- **デメリット**: 管理者IAM権限が必要、セキュリティリスク
- **実装**: `e2e/helpers/cognito-code.ts` を更新

```typescript
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export async function getPasswordResetCode(email: string): Promise<string> {
  const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });
  const command = new AdminGetUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: email,
  });
  const response = await client.send(command);
  // Extract confirmation code from user attributes
  // Note: This may not work as Cognito doesn't expose codes via API
  return code;
}
```

#### 2. テストメールサービスを使用

- **メリット**: 実際のメールフローをテストできる
- **デメリット**: 外部サービスへの依存、追加コスト
- **推奨サービス**: Mailhog (ローカル), MailSlurp (CI/CD)

```typescript
export async function getPasswordResetCode(email: string): Promise<string> {
  // Fetch email from test email service
  const emails = await mailService.getEmails(email);
  const resetEmail = emails.find((e) => e.subject.includes('パスワードリセット'));
  const code = extractCodeFromEmail(resetEmail.body);
  return code;
}
```

#### 3. テスト専用バックエンドエンドポイント

- **メリット**: シンプル、制御しやすい
- **デメリット**: 本番環境に影響しないよう注意が必要
- **実装**: Lambda関数に `/test/confirmation-codes/:email` エンドポイントを追加

```typescript
export async function getPasswordResetCode(email: string): Promise<string> {
  const response = await fetch(`${process.env.API_URL}/test/confirmation-codes/${email}`);
  const data = await response.json();
  return data.code;
}
```

#### 4. Cognitoサービスをモック

- **メリット**: 外部依存なし、高速
- **デメリット**: 実際のCognitoフローをテストできない
- **実装**: MSW (Mock Service Worker) を使用

### 現在の実装

`e2e/helpers/cognito-code.ts` には、ハードコードされた確認コード `123456` を返すモック実装があります。これは実際のCognitoでは動作しません。

### 推奨アプローチ

MVP段階では、**オプション3 (テスト専用エンドポイント)** を推奨します:

1. 環境変数 `TEST_MODE=true` の場合のみ有効
2. テストユーザーの確認コードをDynamoDBに保存
3. テスト専用エンドポイントで取得可能にする
4. 本番環境では無効化

## テストの実行

```bash
# すべての認証テストを実行 (パスワードリセットはスキップされます)
pnpm test:e2e auth/

# 特定のテストのみ実行
pnpm test:e2e auth/registration.spec.ts
pnpm test:e2e auth/login.spec.ts

# パスワードリセットテストを強制実行 (失敗します)
pnpm test:e2e auth/password-reset.spec.ts
```

## 環境変数

E2Eテストには以下の環境変数が必要です:

```bash
BASE_URL=http://localhost:3000  # テスト対象のURL
USER_POOL_ID=ap-northeast-1_xxx  # Cognito User Pool ID (クリーンアップ用)
AWS_REGION=ap-northeast-1  # AWSリージョン
```

## テストの設計

### Page Object Pattern

テストは Page Object Pattern を使用して実装されています。これにより:

- テストコードとページ固有のロジックを分離
- 再利用可能なページアクションとアサーション
- メンテナンスが容易

使用している Page Objects:

- `LoginPage`: ログインページの操作とアサーション
- `RegistrationPage`: 登録ページの操作とアサーション
- `GameListPage`: ゲーム一覧ページの操作とアサーション

### Test Helpers

共通のテストヘルパー関数を使用:

- `createTestUser()`: Cognitoにテストユーザーを作成
- `cleanupTestUser()`: テストユーザーをクリーンアップ
- `generateTestUser()`: 一意のテストユーザーデータを生成

### テストの独立性

各テストは独立して実行可能で、以下を保証します:

- テスト前にテストユーザーを作成
- テスト後にテストユーザーをクリーンアップ
- 他のテストに影響を与えない

## トラブルシューティング

### テストが失敗する場合

1. **環境変数の確認**: `BASE_URL`, `USER_POOL_ID`, `AWS_REGION` が正しく設定されているか確認
2. **サービスの可用性**: フロントエンドとCognitoが起動しているか確認
3. **ネットワーク接続**: テスト環境からAWSサービスにアクセスできるか確認
4. **タイムアウト**: ネットワークが遅い場合はタイムアウト値を増やす

### デバッグ方法

```bash
# ヘッドレスモードを無効にしてブラウザを表示
pnpm playwright test auth/login.spec.ts --headed

# デバッグモードで実行
pnpm playwright test auth/login.spec.ts --debug

# 特定のブラウザでのみ実行
pnpm playwright test auth/login.spec.ts --project=chromium
```
