# Authentication E2E Tests

このディレクトリには、認証フローのE2Eテストが含まれています。

## テストの種類

### 1. 通常のE2Eテスト (`.spec.ts`)

特定のシナリオをテストする従来のE2Eテストです。

- `registration.spec.ts`: ユーザー登録フローのテスト

### 2. プロパティベーステスト (`.property.spec.ts`)

fast-checkを使用して、任意の有効な入力データに対してプロパティが成立することを検証します。

- `registration.property.spec.ts`: ユーザー登録フローのプロパティテスト
  - Property 1: User Registration Creates Cognito User
  - Property 2: Successful Registration Redirects to Home
  - Property 3: Registration Stores Access Token
  - Property 4: Successful Registration Shows No Errors

## テストの実行

### 前提条件

1. アプリケーションがデプロイされているか、ローカルで実行されている必要があります
2. `BASE_URL` 環境変数を設定する必要があります
3. `USER_POOL_ID` 環境変数を設定する必要があります（テストユーザーのクリーンアップ用）
4. AWS認証情報が設定されている必要があります

### ローカルでの実行

```bash
# 開発サーバーを起動
pnpm --filter @vote-board-game/web dev

# 別のターミナルでE2Eテストを実行
BASE_URL=http://localhost:3000 USER_POOL_ID=your-user-pool-id pnpm --filter @vote-board-game/web test:e2e

# 特定のテストファイルのみ実行
BASE_URL=http://localhost:3000 USER_POOL_ID=your-user-pool-id pnpm --filter @vote-board-game/web exec playwright test registration.property.spec.ts

# UIモードでデバッグ
BASE_URL=http://localhost:3000 USER_POOL_ID=your-user-pool-id pnpm --filter @vote-board-game/web test:e2e:ui
```

### CI/CDでの実行

GitHub Actionsでは、デプロイ後に自動的にE2Eテストが実行されます。
CloudFront URLとCognito User Pool IDが自動的に設定されます。

## プロパティベーステストについて

プロパティベーステストは、fast-checkライブラリを使用して、ランダムに生成された入力データに対してテストを実行します。

### 設定

- `numRuns`: 15回のランダムな入力でテストを実行
- `endOnFailure`: 最初の失敗で停止

### 注意事項

1. **E2E環境での実行**: これらのテストは実際のブラウザとCognitoサービスを使用します
2. **テストユーザーのクリーンアップ**: 各テスト後、生成されたテストユーザーは自動的に削除されます
3. **実行時間**: プロパティベーステストは通常のテストよりも時間がかかります（15回の反復）
4. **リソース使用**: 複数のユーザーを作成・削除するため、Cognitoのレート制限に注意してください

## トラブルシューティング

### BASE_URL環境変数が設定されていない

```
Error: BASE_URL environment variable is required for E2E tests
```

解決方法: `BASE_URL` 環境変数を設定してください。

### USER_POOL_ID環境変数が設定されていない

テストユーザーのクリーンアップがスキップされますが、テストは続行されます。
警告メッセージが表示されます。

### AWS認証情報が設定されていない

テストユーザーのクリーンアップが失敗しますが、テストは続行されます。
エラーメッセージがログに出力されます。

### テストがタイムアウトする

- ネットワーク接続を確認してください
- アプリケーションが正しく起動しているか確認してください
- Cognitoサービスが利用可能か確認してください
