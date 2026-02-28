# Vercel 環境変数設定ガイド

## 重要な注意事項

**Next.jsの`NEXT_PUBLIC_*`環境変数はビルド時にコードに埋め込まれます。**

そのため、以下の手順が必要です：

1. Vercelで環境変数を設定
2. **必ず再デプロイを実行**（環境変数を反映するため）

## 手順

### 1. GitHub Actionsから環境変数ファイルをダウンロード

1. GitHub リポジトリ → **Actions** タブ
2. 最新のCDワークフロー実行を選択
3. **Artifacts**セクションから`vercel-env-{environment}`をダウンロード
   - 例: `vercel-env-development`、`vercel-env-production`
4. ZIPファイルを解凍

### 2. Vercelに環境変数を設定

#### 方法1: .envファイルから一括インポート（推奨）

1. Vercel Dashboard → プロジェクト → **Settings** → **Environment Variables**
2. **"Paste .env"**をクリック
3. ダウンロードした`.env.{environment}`ファイルの内容をコピー&ペースト
4. Environmentを選択:
   - **Production**: 本番環境（mainブランチ）
   - **Preview**: プレビュー環境（PRやブランチ）
5. **"Add"**をクリック

#### 方法2: 個別に追加

各環境変数を手動で追加:

| Variable Name                      | Environment         |
| ---------------------------------- | ------------------- |
| `NEXT_PUBLIC_API_URL`              | Production, Preview |
| `NEXT_PUBLIC_APP_URL`              | Production, Preview |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Production, Preview |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID`    | Production, Preview |
| `NEXT_PUBLIC_AWS_REGION`           | Production, Preview |

**注意**: Preview環境の`NEXT_PUBLIC_APP_URL`は`https://$VERCEL_URL`を設定すると、各プレビューデプロイのURLが自動的に使用されます。

### 3. 再デプロイを実行

環境変数を設定した後、**必ず再デプロイ**が必要です：

#### 方法1: Vercel Dashboardから

1. Vercel Dashboard → プロジェクト → **Deployments**タブ
2. 最新のデプロイメントの**"..."**メニュー → **"Redeploy"**
3. **"Redeploy"**ボタンをクリック

#### 方法2: GitHubからプッシュ

GitHubにプッシュして自動デプロイをトリガー

### 4. 動作確認

1. デプロイが完了したら、Vercel URLにアクセス
2. ブラウザの開発者ツール（Console）を開く
3. エラーがないことを確認:
   - ❌ `NEXT_PUBLIC_API_URL is not defined` → 環境変数が設定されていない、または再デプロイが必要
   - ✅ エラーなし → 正常に動作

4. API通信を確認:
   - 対局一覧ページにアクセス
   - ネットワークタブでAPI リクエストが成功していることを確認

## トラブルシューティング

### `NEXT_PUBLIC_API_URL is not defined`エラーが出る

**原因**: 環境変数がビルド時に埋め込まれていない

**解決方法**:

1. Vercelで環境変数が正しく設定されているか確認
2. 環境（Production/Preview）が正しく選択されているか確認
3. **再デプロイを実行**

### CORSエラーが出る

**原因**: バックエンドのCORS設定にVercel URLが含まれていない

**解決方法**:

1. GitHub EnvironmentsでVERCEL_URLが設定されているか確認
2. AWS CDKを再デプロイ（GitHub Actionsが自動実行）

### 環境変数が反映されない

**原因**: 環境変数設定後に再デプロイしていない

**解決方法**:

- Vercel Dashboardから再デプロイを実行
- または、GitHubにプッシュして自動デプロイをトリガー

## 参考

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
