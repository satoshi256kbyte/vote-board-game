# E2E Test Helpers

E2Eテスト用のヘルパー関数群

## 使用方法

### テストユーザーの生成

```typescript
import { generateTestUser } from './helpers';

const testUser = generateTestUser();
// {
//   email: 'test-1234567890-1234@example.com',
//   password: 'TestPass1234567890',
//   username: 'testuser1234567890'
// }
```

### テストユーザーのクリーンアップ

```typescript
import { cleanupTestUser } from './helpers';

// テスト後のクリーンアップ
test.afterEach(async () => {
  await cleanupTestUser(testUser.email);
});
```

### Cognitoサービスの可用性チェック

```typescript
import { skipIfCognitoUnavailable } from './helpers';

test('should register user', async ({ page }, testInfo) => {
  // Cognitoが利用不可の場合はテストをスキップ
  await skipIfCognitoUnavailable(testInfo);

  // テストの実装...
});
```

### ネットワークエラーハンドリング

```typescript
import { navigateWithErrorHandling } from './helpers';

test('should navigate to login page', async ({ page }) => {
  // ネットワークエラー時に詳細なエラーメッセージを表示
  await navigateWithErrorHandling(page, '/login');
});
```

## 環境変数

クリーンアップ機能を使用するには、以下の環境変数が必要です:

- `USER_POOL_ID`: Cognito User Pool ID（必須）
- `AWS_REGION`: AWSリージョン（デフォルト: `ap-northeast-1`）

## 要件

- Requirements 4.1-4.5: テストユーザー管理
- Requirements 7.1: ネットワークエラーハンドリング
- Requirements 7.2: Cognitoサービスエラーハンドリング
- Requirements 8.2: テストデータのクリーンアップ
- Requirements 10.2: Cognitoからのテストユーザー削除

## エラーハンドリング

### クリーンアップ

クリーンアップ関数は以下のエラーを適切に処理します:

- `USER_POOL_ID`が設定されていない場合: 警告を出力してスキップ
- ユーザーが見つからない場合: ログを出力して正常終了
- その他のエラー: エラーログを出力して正常終了（テストを失敗させない）

### Cognito可用性チェック

Cognitoサービスが利用できない場合、テストは自動的にスキップされます:

- グローバルセットアップで可用性をチェック
- 警告メッセージを表示
- 個別のテストで `skipIfCognitoUnavailable()` を使用してスキップ

詳細は [COGNITO_ERROR_HANDLING.md](./COGNITO_ERROR_HANDLING.md) を参照してください。

### ネットワークエラー

アプリケーションが到達不可能な場合、詳細なエラーメッセージを表示します:

- ネットワークエラーの検出
- トラブルシューティング情報の提供
- スクリーンショットの自動保存

詳細は [NETWORK_ERROR_HANDLING.md](./NETWORK_ERROR_HANDLING.md) を参照してください。
