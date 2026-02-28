# Vercel フロントエンドデプロイメントガイド

## 概要

このドキュメントでは、Next.js フロントエンドアプリケーションを Vercel にデプロイする手順を説明します。Vercel を使用することで、動的ルート（`[gameId]`, `[candidateId]`）が正常に動作し、SSR/ISR 機能を活用できます。

## 前提条件

- Vercel アカウント（<https://vercel.com> で作成）
- GitHub リポジトリへのアクセス権限
- AWS CDK がデプロイ済み（バックエンド API が稼働中）
- GitHub Actions の実行権限

## アーキテクチャ

```text
GitHub
  ↓ (push)
Vercel (自動デプロイ)
  ↓ (SSR/ISR)
ユーザー
  ↓ (API リクエスト)
API Gateway + Lambda (バックエンド)
```

## デプロイ手順

### 1. Vercel プロジェクトの作成

#### 1.1 Vercel にログイン

1. <https://vercel.com> にアクセス
2. GitHub アカウントでログイン

#### 1.2 新規プロジェクトの作成

1. Vercel ダッシュボードで **"Add New Project"** をクリック
2. **"Import Git Repository"** セクションで GitHub リポジトリを選択
3. リポジトリ名: `vote-board-game` を検索して選択
4. **"Import"** をクリック

#### 1.3 プロジェクト設定

以下の設定を行います：

| 設定項目             | 値             |
| -------------------- | -------------- |
| **Framework Preset** | Next.js        |
| **Root Directory**   | `packages/web` |
| **Build Command**    | `pnpm build`   |
| **Output Directory** | `.next`        |
| **Install Command**  | `pnpm install` |
| **Node.js Version**  | 24.x           |

**注意**: Root Directory を `packages/web` に設定することが重要です。

#### 1.4 環境変数の設定（後で実施）

この段階では環境変数を設定せず、**"Deploy"** をクリックしてプロジェクトを作成します。環境変数は後の手順で設定します。

### 2. GitHub Environment Variables の設定

GitHub Actions から CDK デプロイ時に Vercel URL を渡すため、GitHub の Environment Variables を設定します。

#### 2.1 GitHub Environments の作成

1. GitHub リポジトリにアクセス
2. **Settings** → **Environments** をクリック
3. 以下の環境を作成（存在しない場合）:
   - `production`
   - `staging`
   - `development`

#### 2.2 各環境に VERCEL_URL を設定

各環境に以下の変数を追加します：

**Production 環境:**

- Name: `VERCEL_URL`
- Value: `https://vote-board-game-web.vercel.app`

**Staging 環境:**

- Name: `VERCEL_URL`
- Value: `https://vote-board-game-web-stg.vercel.app`

**Development 環境:**

- Name: `VERCEL_URL`
- Value: `https://vote-board-game-web-dev.vercel.app`

**注意**: 実際の Vercel URL は、Vercel プロジェクト作成時に割り当てられたドメインを使用してください。

#### 2.3 設定手順

1. 各環境を選択
2. **"Environment variables"** セクションで **"Add variable"** をクリック
3. Name に `VERCEL_URL`、Value に対応する URL を入力
4. **"Add variable"** をクリック

### 3. AWS CDK のデプロイ

Vercel URL を CORS 設定に含めるため、CDK スタックをデプロイします。

#### 3.1 開発環境へのデプロイ

```bash
cd packages/infra

pnpm cdk deploy \
  --context appName=vbg \
  --context environment=dev \
  --context vercelUrl=https://vote-board-game-web-dev.vercel.app
```

#### 3.2 本番環境へのデプロイ

```bash
pnpm cdk deploy \
  --context appName=vbg \
  --context environment=prod \
  --context vercelUrl=https://vote-board-game-web.vercel.app
```

**注意**: `vercelUrl` には、手順 2 で設定した Vercel URL を指定します。

### 4. 環境変数ファイルのダウンロード

GitHub Actions が CDK デプロイ後に生成する環境変数ファイルをダウンロードします。

#### 4.1 GitHub Actions の実行確認

1. GitHub リポジトリの **Actions** タブにアクセス
2. 最新のワークフロー実行を選択
3. ワークフローが正常に完了していることを確認

#### 4.2 Artifacts のダウンロード

1. ワークフロー実行ページの下部にある **"Artifacts"** セクションを確認
2. `vercel-env-files-{run_id}` という名前のアーティファクトをダウンロード
3. ZIP ファイルを解凍

#### 4.3 ファイルの確認

解凍すると以下のファイルが含まれています：

- `.env.production`: 本番環境用の環境変数
- `.env.preview`: プレビュー環境用の環境変数

**ファイル内容の例:**

```env
# .env.production
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.ap-northeast-1.amazonaws.com
NEXT_PUBLIC_APP_URL=https://vote-board-game-web.vercel.app
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
```

### 5. Vercel への環境変数インポート

ダウンロードした環境変数ファイルを Vercel にインポートします。

#### 5.1 Vercel ダッシュボードにアクセス

1. <https://vercel.com> にログイン
2. プロジェクト `vote-board-game` を選択
3. **Settings** → **Environment Variables** をクリック

#### 5.2 Production 環境の設定

1. `.env.production` ファイルをテキストエディタで開く
2. 各環境変数を Vercel に追加:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: ファイルから取得した値
   - **Environment**: `Production` を選択
   - **"Add"** をクリック
3. すべての環境変数について繰り返す

#### 5.3 Preview 環境の設定

1. `.env.preview` ファイルをテキストエディタで開く
2. 各環境変数を Vercel に追加:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: ファイルから取得した値
   - **Environment**: `Preview` を選択
   - **"Add"** をクリック
3. すべての環境変数について繰り返す

**注意**: `NEXT_PUBLIC_APP_URL` の値が `https://$VERCEL_URL` の場合、Vercel が自動的にプレビュー URL に置き換えます。

#### 5.4 環境変数の一覧

以下の環境変数を設定する必要があります：

| 変数名                             | 説明                                 | 環境                |
| ---------------------------------- | ------------------------------------ | ------------------- |
| `NEXT_PUBLIC_API_URL`              | API Gateway のエンドポイント URL     | Production, Preview |
| `NEXT_PUBLIC_APP_URL`              | フロントエンドアプリケーションの URL | Production, Preview |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito ユーザープール ID            | Production, Preview |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID`    | Cognito クライアント ID              | Production, Preview |
| `NEXT_PUBLIC_AWS_REGION`           | AWS リージョン（`ap-northeast-1`）   | Production, Preview |

### 6. デプロイの検証

環境変数を設定した後、Vercel が自動的に再デプロイを開始します。

#### 6.1 デプロイ状況の確認

1. Vercel ダッシュボードの **"Deployments"** タブにアクセス
2. 最新のデプロイメントが **"Ready"** 状態になるまで待機
3. デプロイログにエラーがないことを確認

#### 6.2 アプリケーションの動作確認

1. **本番 URL にアクセス**
   - <https://vote-board-game-web.vercel.app> にアクセス
   - トップページが正常に表示されることを確認

2. **動的ルートの確認**
   - `/games/[gameId]` などの動的ルートにアクセス
   - 404 エラーが発生しないことを確認

3. **API 通信の確認**
   - ブラウザの開発者ツールを開く（F12）
   - **Console** タブを確認
   - CORS エラーが表示されないことを確認
   - **Network** タブで API リクエストが成功していることを確認

4. **認証機能の確認**
   - ログイン機能を試す
   - Cognito 認証が正常に動作することを確認

#### 6.3 プレビューデプロイの確認

1. GitHub で feature ブランチを作成してプッシュ
2. Vercel が自動的にプレビューデプロイを作成
3. プレビュー URL にアクセスして動作確認

### 7. カスタムドメインの設定（オプション）

独自ドメインを使用する場合の設定手順です。

#### 7.1 ドメインの追加

1. Vercel ダッシュボードで **Settings** → **Domains** をクリック
2. **"Add"** をクリック
3. ドメイン名を入力（例: `vote-board-game.com`）
4. **"Add"** をクリック

#### 7.2 DNS レコードの設定

Vercel が DNS レコードの設定方法を表示します：

**A レコード:**

- Type: `A`
- Name: `@`
- Value: `76.76.21.21`

**CNAME レコード:**

- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

#### 7.3 SSL 証明書の発行

DNS レコードが正しく設定されると、Vercel が自動的に SSL 証明書を発行します（Let's Encrypt）。

## ロールバック手順

デプロイに問題が発生した場合のロールバック手順です。

### Vercel でのロールバック

#### 方法 1: Vercel ダッシュボードから

1. Vercel ダッシュボードの **"Deployments"** タブにアクセス
2. ロールバックしたいデプロイメント（前のバージョン）を選択
3. **"Promote to Production"** をクリック
4. 確認ダイアログで **"Promote"** をクリック

#### 方法 2: Git から

1. GitHub で前のコミットに戻す
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Vercel が自動的に前のバージョンをデプロイ

### AWS リソースのロールバック

CDK スタックに問題がある場合：

```bash
cd packages/infra

# 前のコミットをチェックアウト
git checkout <previous-commit>

# CDK スタックをデプロイ
pnpm cdk deploy \
  --context appName=vbg \
  --context environment=prod \
  --context vercelUrl=https://vote-board-game-web.vercel.app
```

## トラブルシューティング

### 問題 1: CORS エラーが発生する

**症状:**

- ブラウザのコンソールに以下のようなエラーが表示される:
  ```text
  Access to fetch at 'https://api.example.com' from origin 'https://vote-board-game-web.vercel.app' has been blocked by CORS policy
  ```

**原因:**

- API Gateway の CORS 設定に Vercel URL が含まれていない
- Lambda 関数の `ALLOWED_ORIGINS` 環境変数が正しくない

**解決策:**

1. **CDK スタックの確認**

   ```bash
   cd packages/infra
   pnpm cdk diff --context appName=vbg --context environment=prod --context vercelUrl=https://vote-board-game-web.vercel.app
   ```

2. **Lambda 環境変数の確認**
   - AWS コンソールで Lambda 関数を開く
   - **Configuration** → **Environment variables** を確認
   - `ALLOWED_ORIGINS` に Vercel URL が含まれていることを確認

3. **再デプロイ**
   ```bash
   pnpm cdk deploy \
     --context appName=vbg \
     --context environment=prod \
     --context vercelUrl=https://vote-board-game-web.vercel.app
   ```

### 問題 2: 動的ルートが 404 エラーになる

**症状:**

- `/games/[gameId]` などの動的ルートにアクセスすると 404 エラー

**原因:**

- `next.config.ts` に `output: 'export'` が残っている
- Vercel の Framework Preset が正しく設定されていない

**解決策:**

1. **next.config.ts の確認**

   ```typescript
   // packages/web/next.config.ts
   const nextConfig: NextConfig = {
     reactStrictMode: true,
     transpilePackages: ['@vote-board-game/shared'],
     // output: 'export' が削除されていることを確認
   };
   ```

2. **Vercel 設定の確認**
   - Vercel ダッシュボードで **Settings** → **General** を開く
   - **Framework Preset** が `Next.js` になっていることを確認
   - **Root Directory** が `packages/web` になっていることを確認

3. **再デプロイ**
   - GitHub に変更をプッシュして再デプロイ

### 問題 3: 環境変数が反映されない

**症状:**

- `process.env.NEXT_PUBLIC_API_URL` が `undefined`
- API リクエストが失敗する

**原因:**

- Vercel の環境変数が設定されていない
- 環境変数名が間違っている
- 環境変数を更新した後に再デプロイしていない

**解決策:**

1. **環境変数の確認**
   - Vercel ダッシュボードで **Settings** → **Environment Variables** を開く
   - すべての必要な環境変数が設定されていることを確認
   - 環境変数名が `NEXT_PUBLIC_` で始まっていることを確認

2. **再デプロイ**
   - Vercel ダッシュボードで **Deployments** → 最新のデプロイメント → **"Redeploy"** をクリック

3. **ローカルでの確認**
   ```bash
   cd packages/web
   echo $NEXT_PUBLIC_API_URL
   ```

### 問題 4: ビルドが失敗する

**症状:**

- Vercel のビルドログにエラーが表示される
- デプロイが **"Error"** 状態になる

**原因:**

- TypeScript のコンパイルエラー
- 依存関係のインストールエラー
- Node.js のバージョン不一致

**解決策:**

1. **ローカルでビルドを確認**

   ```bash
   cd packages/web
   pnpm install
   pnpm build
   ```

2. **エラーメッセージの確認**
   - Vercel のビルドログを詳細に確認
   - エラーメッセージに従って修正

3. **Node.js バージョンの確認**
   - Vercel ダッシュボードで **Settings** → **General** を開く
   - **Node.js Version** が `24.x` になっていることを確認

4. **依存関係の更新**
   ```bash
   pnpm install
   pnpm update
   ```

### 問題 5: プレビューデプロイが作成されない

**症状:**

- feature ブランチをプッシュしてもプレビューデプロイが作成されない

**原因:**

- Vercel の Git 統合が無効になっている
- ブランチが保護されている

**解決策:**

1. **Git 統合の確認**
   - Vercel ダッシュボードで **Settings** → **Git** を開く
   - **"Connected Git Repository"** が正しく設定されていることを確認

2. **ブランチ設定の確認**
   - **"Production Branch"** が `main` になっていることを確認
   - **"Automatic Deployments"** が有効になっていることを確認

3. **再接続**
   - 必要に応じて Git リポジトリを再接続

### 問題 6: API リクエストがタイムアウトする

**症状:**

- API リクエストが長時間待機した後にタイムアウト
- ネットワークエラーが発生

**原因:**

- API Gateway のエンドポイント URL が間違っている
- Lambda 関数がコールドスタート中
- ネットワークの問題

**解決策:**

1. **API URL の確認**
   - Vercel の環境変数 `NEXT_PUBLIC_API_URL` が正しいことを確認
   - AWS コンソールで API Gateway のエンドポイント URL を確認

2. **Lambda のウォームアップ**
   - AWS コンソールで Lambda 関数を手動で実行してウォームアップ

3. **CloudWatch ログの確認**
   - AWS コンソールで CloudWatch Logs を確認
   - Lambda 関数のエラーログを確認

## 継続的デプロイ

### 自動デプロイのフロー

1. **開発者がコードをプッシュ**

   ```bash
   git add .
   git commit -m "feat: 新機能を追加"
   git push origin feature/new-feature
   ```

2. **Vercel が自動的にプレビューデプロイを作成**
   - GitHub の PR にプレビュー URL がコメントされる
   - プレビュー環境で動作確認

3. **PR をマージ**

   ```bash
   git checkout main
   git merge feature/new-feature
   git push origin main
   ```

4. **Vercel が自動的に本番デプロイを実行**
   - 本番環境に新しいバージョンがデプロイされる

### GitHub Actions との連携

GitHub Actions は以下のタスクを実行します：

1. **CDK スタックのデプロイ**（バックエンドインフラ）
2. **環境変数ファイルの生成**（`.env.production`, `.env.preview`）
3. **Artifacts へのアップロード**

Vercel は以下のタスクを実行します：

1. **フロントエンドのビルド**
2. **デプロイ**
3. **プレビュー URL の生成**

## セキュリティのベストプラクティス

### 1. 環境変数の管理

- **機密情報を含めない**: `NEXT_PUBLIC_` で始まる環境変数はクライアント側に公開されます
- **API キーは使用しない**: フロントエンドに API キーを含めないでください
- **Cognito を使用**: 認証には Cognito を使用し、JWT トークンで API にアクセス

### 2. CORS 設定

- **明示的なオリジンのみ許可**: ワイルドカード（`*`）は使用しない
- **必要な HTTP メソッドのみ許可**: GET, POST, PUT, DELETE, OPTIONS
- **必要なヘッダーのみ許可**: Content-Type, Authorization

### 3. デプロイの保護

- **本番ブランチの保護**: GitHub で `main` ブランチを保護
- **レビュープロセス**: PR レビューを必須にする
- **自動テスト**: GitHub Actions で自動テストを実行

## 参考資料

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [AWS API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)

## まとめ

このガイドに従うことで、Next.js フロントエンドアプリケーションを Vercel に正常にデプロイできます。主なポイント：

1. **Vercel プロジェクトの作成**: Framework Preset と Root Directory を正しく設定
2. **GitHub Variables の設定**: 各環境に `VERCEL_URL` を設定
3. **CDK のデプロイ**: Vercel URL を CORS 設定に含める
4. **環境変数のインポート**: GitHub Actions から生成されたファイルを使用
5. **デプロイの検証**: 動的ルート、API 通信、認証機能を確認

問題が発生した場合は、トラブルシューティングセクションを参照してください。
