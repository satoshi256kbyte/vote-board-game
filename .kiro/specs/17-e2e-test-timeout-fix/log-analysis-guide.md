# GitHub Actions ログ分析ガイド

## ログの場所

1. GitHubリポジトリにアクセス: `https://github.com/satoshi256kbyte/vote-borard-game/actions`
2. ワークフロー名: **"E2E Tests - Game Management"** を探す
3. 最新の実行（最後のプッシュから）をクリック

## 確認すべき重要な情報

### ステップ1: "Create .env file for E2E tests"

ログでこのセクションを探してください：

```
=== Environment Variables (masked) ===
BASE_URL: https://...
NEXT_PUBLIC_API_URL: https://...
...
====================================
```

**確認事項:**

- `NEXT_PUBLIC_API_URL` が定義されているか？（空でない、"undefined"でない）
- `https://` で始まっているか？
- 有効なAPI Gateway URLに見えるか？
- 正確な値をここにメモ: `_______________________`

### ステップ2: "Run game management E2E tests" - 環境変数の検証

以下を探してください：

```
=== Verifying environment variables are loaded ===
NEXT_PUBLIC_API_URL: ...
BASE_URL: ...
...
==================================================
```

**確認事項:**

- 環境変数が正しく読み込まれているか？
- ステップ1の値と一致しているか？

### ステップ3: APIアクセシビリティテスト

以下を探してください：

```
=== Testing API URL accessibility ===
Attempting to reach API at: https://...
✓ API is accessible, HTTP status: 200
==================================================
```

**確認事項:**

- "✓ API is accessible" と表示されているか？
- HTTPステータスコードは？
- "✗ API is not accessible" と表示されている場合、エラーメッセージをメモ

### ステップ4: Vercelデプロイメントアクセシビリティテスト

以下を探してください：

```
=== Testing Vercel deployment accessibility ===
Attempting to reach Vercel at: https://...
✓ Vercel deployment is accessible, HTTP status: 200
==================================================
```

**確認事項:**

- "✓ Vercel deployment is accessible" と表示されているか？
- HTTPステータスコードは？
- "✗" と表示されている場合、エラーメッセージをメモ

### ステップ5: Playwrightテスト実行

実際のテスト結果を探してください：

```
Running 24 tests using 1 worker
```

**確認事項:**

- 成功したテスト数は？
- 失敗したテスト数は？
- タイムアウトエラーはあるか？

### ステップ6: ブラウザコンソールログ（最重要！）

Playwrightがブラウザコンソールログをキャプチャします。以下で始まる行を探してください：

```
[getApiBaseUrl] Environment check:
[getApiBaseUrl] Using API URL:
[createGame] Request:
[createGame] Response:
```

**抽出する情報:**

1. `[getApiBaseUrl] Environment check: { ... }` ブロック全体
2. `[getApiBaseUrl] Using API URL: ...` の行
3. `[createGame] Request: { ... }` ブロック
4. `[createGame] Response: { ... }` ブロック
5. `[createGame] Error: { ... }` ブロック（もしあれば）

### ステップ7: テスト失敗の詳細

テストが失敗した場合、以下を探してください：

```
Error: page.waitForURL: Timeout 30000ms exceeded.
```

または：

```
Error: page.content: Target page, context or browser has been closed
```

**メモする情報:**

- 完全なエラーメッセージ
- スタックトレース（もしあれば）
- どのテストが失敗したか

## クイック診断チェックリスト

### 問題1: 環境変数が設定されていない

- **症状**: `NEXT_PUBLIC_API_URL: undefined` または空
- **次のステップ**: タスク3.4 - 環境変数の設定を修正

### 問題2: 無効なURL形式

- **症状**: URLが `http://` または `https://` で始まっていない
- **次のステップ**: タスク3.4 - 環境変数のURL形式を修正

### 問題3: APIにアクセスできない

- **症状**: curlテストで "✗ API is not accessible" と表示
- **考えられる原因**: API Gatewayがデプロイされていない、ネットワークの問題、CORS
- **次のステップ**: タスク3.6 - APIデプロイメントを調査

### 問題4: CORSエラー

- **症状**: ブラウザコンソールにCORSエラーが表示される
- **例**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- **次のステップ**: タスク3.6 - CORS設定を確認

### 問題5: 401 Unauthorized

- **症状**: APIが401ステータスコードを返す
- **次のステップ**: タスク3.8 - 認証トークンの処理を確認

### 問題6: ネットワークタイムアウト

- **症状**: リクエストに時間がかかりすぎ、レスポンスが返ってこない
- **次のステップ**: タスク3.10 - タイムアウトとリトライロジックを実装

### 問題7: DynamoDB結果整合性

- **症状**: ゲーム作成は成功したが、ゲーム詳細ページで「ゲームが見つかりません」
- **次のステップ**: タスク3.12 - DynamoDB結果整合性への対応を実装

## 報告していただきたい情報

以下の情報を教えてください：

1. **環境変数の値**
2. **APIアクセシビリティテストの結果**（✓ または ✗）
3. **テスト結果**（成功数/失敗数）
4. **ブラウザコンソールログ**（特に `[getApiBaseUrl]` と `[createGame]` のログ）
5. **エラーメッセージ**（もしあれば）

または、GitHub Actionsの実行ページのURLを共有していただければ、直接ログを確認できます。
