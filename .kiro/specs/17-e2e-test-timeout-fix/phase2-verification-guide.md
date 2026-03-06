# Phase 2: 環境変数の検証と修正 - 検証ガイド

## 実施した変更

### 1. API クライアントの改善 (`packages/web/src/lib/api/client.ts`)

`getApiBaseUrl()` 関数を強化し、以下の機能を追加しました:

- **詳細なデバッグログ**: 環境変数の状態を詳細に記録
- **環境変数の検証**: `NEXT_PUBLIC_API_URL` が未定義の場合、詳細なエラーメッセージを出力
- **URL形式の検証**: URLが `http://` または `https://` で始まることを確認
- **利用可能な環境変数のリスト**: エラー時に `NEXT_PUBLIC_` で始まる環境変数をリスト表示

### 2. GitHub Actions ワークフローの改善 (`.github/workflows/e2e-game.yml`)

以下のデバッグ機能を追加しました:

- **.env.test ファイルの内容表示**: パスワードをマスクした状態でファイル内容を出力
- **環境変数の読み込み確認**: テスト実行前に環境変数が正しく読み込まれているか確認
- **API アクセシビリティテスト**: curl を使用してAPIエンドポイントにアクセス可能か確認
- **Vercel デプロイメントのアクセシビリティテスト**: Vercel URLにアクセス可能か確認

## GitHub Actions ログで確認すべきポイント

### ステップ1: "Create .env file for E2E tests"

以下の情報が出力されます:

```
=== Environment Variables (masked) ===
BASE_URL: https://your-app.vercel.app
NEXT_PUBLIC_API_URL: https://your-api-url.execute-api.ap-northeast-1.amazonaws.com
...
====================================

=== .env.test file content (passwords masked) ===
BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_API_URL=https://your-api-url.execute-api.ap-northeast-1.amazonaws.com
...
==================================================
```

**確認事項:**

- `NEXT_PUBLIC_API_URL` が正しいAPI Gateway URLを指しているか
- `BASE_URL` が正しいVercel URLを指しているか
- 値が空または `None` になっていないか

### ステップ2: "Run game management E2E tests"

以下の情報が出力されます:

```
=== Verifying environment variables are loaded ===
NEXT_PUBLIC_API_URL: https://your-api-url.execute-api.ap-northeast-1.amazonaws.com
BASE_URL: https://your-app.vercel.app
CI: true
NODE_ENV: test
==================================================

=== Testing API URL accessibility ===
Attempting to reach API at: https://your-api-url.execute-api.ap-northeast-1.amazonaws.com
✓ API is accessible, HTTP status: 200
==================================================

=== Testing Vercel deployment accessibility ===
Attempting to reach Vercel at: https://your-app.vercel.app
✓ Vercel deployment is accessible, HTTP status: 200
==================================================
```

**確認事項:**

- 環境変数が正しく読み込まれているか
- APIエンドポイントにアクセス可能か（HTTP 200が返るか）
- Vercelデプロイメントにアクセス可能か（HTTP 200が返るか）

### ステップ3: Playwright テストログ

ブラウザコンソールログに以下の情報が出力されます:

```
[getApiBaseUrl] Environment check: {
  NEXT_PUBLIC_API_URL: 'https://your-api-url.execute-api.ap-northeast-1.amazonaws.com',
  NODE_ENV: 'production',
  isDefined: true,
  isEmpty: false
}
[getApiBaseUrl] Using API URL: https://your-api-url.execute-api.ap-northeast-1.amazonaws.com

[createGame] Request: {
  url: 'https://your-api-url.execute-api.ap-northeast-1.amazonaws.com/api/games',
  method: 'POST',
  ...
}
```

**確認事項:**

- `NEXT_PUBLIC_API_URL` がブラウザ内で正しく設定されているか
- APIリクエストが正しいURLに送信されているか

## 想定される問題と対処法

### 問題1: 環境変数が未定義

**症状:**

```
NEXT_PUBLIC_API_URL: undefined
[getApiBaseUrl] Error: NEXT_PUBLIC_API_URL is not defined
```

**原因:**

- Vercelデプロイメント時に環境変数が設定されていない
- Next.jsのビルド時に環境変数が埋め込まれていない

**対処法:**

1. Vercelの環境変数設定を確認
2. デプロイワークフロー（`deploy-reusable.yml`）で環境変数が正しく生成されているか確認
3. Vercelに環境変数を手動で設定し、再デプロイ

### 問題2: URL形式が不正

**症状:**

```
[getApiBaseUrl] Error: NEXT_PUBLIC_API_URL has invalid format: "localhost:3001"
```

**原因:**

- URLが `http://` または `https://` で始まっていない

**対処法:**

1. `.env.test` ファイルのURL形式を修正
2. CloudFormation OutputsのURL形式を確認

### 問題3: APIにアクセスできない

**症状:**

```
✗ API is not accessible or returned error
HTTP status: 000
```

**原因:**

- API Gatewayがデプロイされていない
- CORS設定の問題
- ネットワークの問題

**対処法:**

1. API Gatewayのデプロイ状態を確認
2. CORS設定を確認（次のフェーズで対応）
3. AWS CloudFormation スタックの状態を確認

### 問題4: Vercelデプロイメントにアクセスできない

**症状:**

```
✗ Vercel deployment is not accessible or returned error
HTTP status: 404
```

**原因:**

- Vercel URLが間違っている
- デプロイメントが失敗している

**対処法:**

1. Vercel URLを確認
2. Vercelのデプロイメント状態を確認
3. GitHub Variables の `VERCEL_URL` を確認

## 次のステップ

このフェーズの実行後、GitHub Actions ログを確認し、以下を判断します:

1. **環境変数が正しく設定されている場合**: Phase 3（CORS設定の確認）に進む
2. **環境変数が未定義または不正な場合**: 環境変数の設定を修正し、再度このフェーズを実行
3. **APIまたはVercelにアクセスできない場合**: インフラの問題を調査

## 実行方法

1. 変更をGitHubにプッシュ:

   ```bash
   git add .
   git commit -m "feat: add environment variable validation and debugging"
   git push
   ```

2. GitHub Actionsで `E2E Tests - Game Management` ワークフローを手動実行

3. ワークフローログを確認し、上記のポイントをチェック

4. 問題が特定されたら、対処法に従って修正
