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

## 環境変数

クリーンアップ機能を使用するには、以下の環境変数が必要です:

- `USER_POOL_ID`: Cognito User Pool ID（必須）
- `AWS_REGION`: AWSリージョン（デフォルト: `ap-northeast-1`）

## 要件

- Requirements 4.1-4.5: テストユーザー管理
- Requirements 8.2: テストデータのクリーンアップ
- Requirements 10.2: Cognitoからのテストユーザー削除

## エラーハンドリング

クリーンアップ関数は以下のエラーを適切に処理します:

- `USER_POOL_ID`が設定されていない場合: 警告を出力してスキップ
- ユーザーが見つからない場合: ログを出力して正常終了
- その他のエラー: エラーログを出力して正常終了（テストを失敗させない）
