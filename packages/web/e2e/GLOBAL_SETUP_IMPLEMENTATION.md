# グローバルセットアップ実装完了

## 概要

E2Eテスト実行前にサービスの可用性を確認するグローバルセットアップを実装しました。

## 実装内容

### 1. グローバルセットアップ (`e2e/global-setup.ts`)

以下の機能を実装:

#### フロントエンド可用性チェック

- `BASE_URL` 環境変数の検証
- フロントエンドへのHTTPリクエストで可用性を確認
- 30秒のタイムアウト設定
- 失敗時は明確なエラーメッセージを表示してフェイルファスト

#### API可用性チェック

- `NEXT_PUBLIC_API_URL` 環境変数が設定されている場合にチェック
- APIへのHTTPリクエストで可用性を確認
- 30秒のタイムアウト設定
- 失敗時は明確なエラーメッセージを表示してフェイルファスト

#### Cognito可用性チェック

- 既存の `isCognitoAvailable()` ヘルパーを使用
- Cognitoが利用不可の場合は警告を表示するが、テストは継続
- テスト内で個別にスキップ判定が可能

### 2. エラーハンドリング

- **フェイルファスト**: フロントエンドまたはAPIが利用不可の場合、即座にエラーを投げてテスト実行を中止
- **明確なエラーメッセージ**: どのサービスが利用不可か、理由は何かを明確に表示
- **タイムアウト**: 各チェックに30秒のタイムアウトを設定し、無限待機を防止

### 3. テスト

#### ユニットテスト (`e2e/global-setup.test.ts`)

- BASE_URL検証のテスト
- フロントエンド可用性チェックのテスト
- API可用性チェックのテスト
- Cognito可用性チェックのテスト
- エラーハンドリングのテスト
- タイムアウトのテスト

#### 統合テスト (`e2e/global-setup.integration.test.ts`)

- 実際のサービスとの統合テスト
- サービスが起動していない場合のテスト

## 使用方法

### 環境変数の設定

```bash
# 必須
export BASE_URL=http://localhost:3000

# オプション（設定されている場合はチェックされる）
export NEXT_PUBLIC_API_URL=http://localhost:3001
export USER_POOL_ID=your-user-pool-id
export AWS_REGION=ap-northeast-1
```

### テストの実行

```bash
# Playwrightテストを実行（グローバルセットアップが自動実行される）
pnpm exec playwright test

# ユニットテストを実行
pnpm exec vitest run e2e/global-setup.test.ts --config vitest.config.e2e-helpers.ts
```

## 実装の詳細

### タイムアウト設定

```typescript
const TIMEOUT_MS = 30000; // 30秒
```

各サービスチェックで `AbortController` を使用してタイムアウトを実装:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

const response = await fetch(url, {
  signal: controller.signal,
});

clearTimeout(timeoutId);
```

### エラーメッセージ

失敗時には以下のような明確なエラーメッセージを表示:

```
❌ Service availability check failed:
   Frontend not accessible at http://localhost:3000: Connection refused
```

### Playwright設定との統合

`playwright.config.ts` で既に登録済み:

```typescript
{
  globalSetup: './e2e/global-setup.ts',
  // ...
}
```

## 受け入れ基準の達成状況

- ✅ `e2e/global-setup.ts`を作成
- ✅ フロントエンドの可用性チェックを実装
- ✅ Cognitoの可用性チェックを実装
- ✅ APIの可用性チェックを実装
- ✅ サービスが利用不可の場合はフェイルファストする
- ✅ タイムアウト設定（30秒）
- ✅ エラーメッセージを明確に表示
- ✅ `playwright.config.ts`にグローバルセットアップを登録
- ✅ ユニットテストを作成

## 今後の改善案

1. **ヘルスチェックエンドポイント**: APIに専用のヘルスチェックエンドポイント（`/health`）を追加することで、より正確な可用性チェックが可能
2. **リトライロジック**: 一時的なネットワークエラーに対応するため、リトライロジックを追加
3. **並列チェック**: 複数のサービスチェックを並列実行して、セットアップ時間を短縮
4. **詳細なログ**: デバッグ用に詳細なログオプションを追加

## 関連ファイル

- `packages/web/e2e/global-setup.ts` - グローバルセットアップの実装
- `packages/web/e2e/global-setup.test.ts` - ユニットテスト
- `packages/web/e2e/global-setup.integration.test.ts` - 統合テスト
- `packages/web/playwright.config.ts` - Playwright設定
- `packages/web/e2e/helpers/cognito-availability.ts` - Cognito可用性チェックヘルパー
