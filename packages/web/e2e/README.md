# E2E Tests

投票対局アプリケーションのエンドツーエンド（E2E）テストスイートです。Playwrightを使用して、ブラウザの観点から主要なユーザーフローを検証します。

## ディレクトリ構造

```
e2e/
├── auth/                    # 認証フローのテスト
├── game/                    # ゲーム閲覧と参加のテスト
├── voting/                  # 投票機能のテスト
├── profile/                 # プロフィール管理のテスト
├── sharing/                 # ソーシャルシェアのテスト
├── error-handling/          # エラーハンドリングのテスト
├── fixtures/                # Playwrightフィクスチャ
├── helpers/                 # テストヘルパー関数
├── page-objects/            # Page Object Models
├── global-setup.ts          # グローバルセットアップ
└── README.md                # このファイル
```

## テスト実行

### ローカル環境

```bash
# すべてのテストを実行（ヘッドレスモード）
pnpm test:e2e

# ビジュアルモードで実行
pnpm test:e2e:headed

# UIモードで実行（デバッグに便利）
pnpm test:e2e:ui

# 特定のテストファイルを実行
pnpm test:e2e auth/login.spec.ts

# 特定のブラウザで実行
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### テストレポート

```bash
# HTMLレポートを表示
pnpm test:e2e:report
```

## 環境変数

E2Eテストを実行する前に、以下の環境変数を設定してください：

```bash
# テスト対象のベースURL（必須）
BASE_URL=http://localhost:3000

# Cognito設定（テストユーザー作成に必要）
AWS_REGION=ap-northeast-1
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id
```

## ブラウザサポート

以下のブラウザでテストを実行します：

- **Chromium** - Chrome、Edge
- **Firefox** - Firefox
- **WebKit** - Safari

## テストの設計原則

### Page Object Model (POM)

各画面のセレクタとアクションをPage Objectにカプセル化しています。これにより：

- テストコードの可読性が向上
- 保守性が向上（画面変更時の修正箇所が明確）
- 再利用性が向上

### Fixtures

Playwrightのフィクスチャを使用して、テストデータのセットアップとクリーンアップを自動化しています。

### 安定したセレクタ

`data-testid`属性を使用した安定したセレクタを優先しています。CSSクラスやXPathは避けています。

### 明示的な待機

動的コンテンツやネットワークリクエストには明示的な待機を使用し、フレーキーなテストを防いでいます。

## テストカバレッジ

### 認証フロー

- ユーザー登録
- ログイン/ログアウト
- パスワードリセット
- 認証エラーハンドリング

### ゲームフロー

- ゲーム一覧表示
- ゲーム詳細表示
- ゲーム参加

### 投票フロー

- 次の一手候補の表示
- 投票送信
- 候補投稿
- 投票バリデーション

### プロフィール管理

- プロフィール表示
- プロフィール更新
- 投票履歴表示

### ソーシャルシェア

- シェアURL生成
- OGPメタタグ検証
- OGP画像検証

### エラーハンドリング

- ネットワークエラー
- セッションタイムアウト
- バリデーションエラー
- 404エラー

## トラブルシューティング

### テストが失敗する

1. **環境変数を確認**
   - `BASE_URL`が正しく設定されているか
   - Cognito設定が正しいか

2. **サービスの可用性を確認**
   - フロントエンドが起動しているか
   - APIが応答しているか
   - Cognitoが利用可能か

3. **スクリーンショットを確認**
   - `test-results/`ディレクトリに失敗時のスクリーンショットが保存されます

4. **トレースを確認**
   - `playwright-report/`でHTMLレポートを開き、トレースを確認

### テストがタイムアウトする

- ネットワークが遅い場合は、`playwright.config.ts`のタイムアウト設定を調整
- ローディング状態の待機が不足している可能性があるため、明示的な待機を追加

### ブラウザのインストール

```bash
# すべてのブラウザをインストール
pnpm playwright:install

# 特定のブラウザのみインストール
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

## CI/CD統合

GitHub Actionsでの実行例：

```yaml
- name: Install Playwright browsers
  run: pnpm playwright:install

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    BASE_URL: ${{ secrets.TEST_BASE_URL }}
    AWS_REGION: ap-northeast-1
    COGNITO_USER_POOL_ID: ${{ secrets.COGNITO_USER_POOL_ID }}
    COGNITO_CLIENT_ID: ${{ secrets.COGNITO_CLIENT_ID }}

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: packages/web/playwright-report/
```

## ベストプラクティス

1. **テストの独立性** - 各テストは独立して実行可能であること
2. **テストデータのクリーンアップ** - テスト後は必ずデータをクリーンアップ
3. **明示的な待機** - `waitFor`を使用して動的コンテンツを待機
4. **安定したセレクタ** - `data-testid`を優先的に使用
5. **適切なタイムアウト** - テストタイムアウトは15秒に設定
6. **並列実行** - 独立したテストは並列実行可能にする

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
