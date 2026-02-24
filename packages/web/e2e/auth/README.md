# Authentication E2E Tests

このディレクトリには認証フローのE2Eテストが含まれています。

## テストファイル

### ✅ registration.spec.ts

ユーザー登録フローのテスト。完全に動作します。

### ✅ login.spec.ts

ログインフローのテスト。完全に動作します。

### ⚠️ password-reset.spec.ts

パスワードリセットフローのテスト。**現在スキップされています。**

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
pnpm test:e2e

# 特定のテストのみ実行
pnpm test:e2e registration.spec.ts
pnpm test:e2e login.spec.ts

# パスワードリセットテストを強制実行 (失敗します)
pnpm test:e2e password-reset.spec.ts
```

## 環境変数

E2Eテストには以下の環境変数が必要です:

```bash
BASE_URL=http://localhost:3000  # テスト対象のURL
USER_POOL_ID=ap-northeast-1_xxx  # Cognito User Pool ID (クリーンアップ用)
AWS_REGION=ap-northeast-1  # AWSリージョン
```
