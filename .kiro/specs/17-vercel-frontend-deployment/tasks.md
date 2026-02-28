# 実装計画: Vercel フロントエンドデプロイ

## 概要

Next.js フロントエンドアプリケーションを AWS S3 + CloudFront から Vercel に移行します。動的ルート（`[gameId]`, `[candidateId]`）を正常に動作させるため、Vercel の SSR/ISR 機能を活用します。実装は以下の順序で進めます：

1. CORS ミドルウェアの実装とテスト
2. Next.js 設定の更新
3. AWS CDK スタックの更新
4. GitHub Actions ワークフローの更新
5. Vercel プロジェクトの設定（手動作業）
6. デプロイの検証

## タスク

- [ ] 1. CORS ミドルウェアの実装
  - [ ] 1.1 CORS ミドルウェアの実装
    - `packages/api/src/middleware/cors.ts` を作成
    - 明示的なオリジンのみを許可（ワイルドカードパターンは使用しない）
    - プリフライトリクエスト（OPTIONS）の処理を実装
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]\* 1.2 CORS ミドルウェアのユニットテストを作成
    - `packages/api/src/middleware/cors.test.ts` を作成
    - Vercel 本番ドメインからのリクエストを許可するテスト
    - 明示的な Vercel URL からのリクエストを許可するテスト
    - プリフライトリクエストの処理テスト
    - 未承認オリジンからのリクエストを拒否するテスト
    - _要件: 3.1, 3.2, 3.5_
  - [ ]\* 1.3 CORS ミドルウェアのプロパティベーステストを作成
    - `packages/api/src/middleware/cors.property.test.ts` を作成
    - **Property 1: CORS ヘッダーの許可**
    - **検証: 要件 3.1, 3.2**
    - **Property 2: 不正なオリジンの拒否**
    - **検証: 要件 3.1, 3.2**
    - **Property 3: 複数オリジンの処理**
    - **検証: 要件 3.1**
    - **Property 4: 完全一致の検証**
    - **検証: 要件 3.1**
    - _要件: 3.1, 3.2, 3.3, 3.5_
  - [ ] 1.4 API エントリーポイントに CORS ミドルウェアを統合
    - `packages/api/src/index.ts` を更新
    - 環境変数 `ALLOWED_ORIGINS` から CORS ミドルウェアを初期化
    - すべてのルートに CORS ミドルウェアを適用
    - _要件: 3.1, 3.2_

- [x] 2. Next.js 設定の更新
  - [x] 2.1 Next.js 設定ファイルを更新
    - `packages/web/next.config.ts` から `output: 'export'` を削除
    - SSR/ISR を有効化
    - 画像最適化の設定を追加
    - _要件: 6.1, 6.2, 6.4_
  - [x] 2.2 package.json のビルドスクリプトを確認
    - `packages/web/package.json` のビルドコマンドが Vercel と互換性があることを確認
    - 不要な静的エクスポート関連のスクリプトを削除
    - _要件: 6.1_

- [x] 3. AWS CDK スタックの更新
  - [x] 3.1 フロントエンド関連リソースを削除
    - `packages/infra/lib/vote-board-game-stack.ts` を更新
    - Web S3 Bucket (`webBucket`) を削除
    - Web CloudFront Distribution (`distribution`) を削除
    - 関連する CloudFormation Outputs を削除
    - _要件: 4.1, 4.2, 4.3, 4.5_
  - [x] 3.2 CORS 設定を更新
    - `allowedOrigins` の計算ロジックを更新
    - Vercel URL を CDK context パラメータ `vercelUrl` から取得（`vercelProductionUrl` から変更）
    - 開発環境: `http://localhost:3000,{vercelUrl}`（vercelUrl が設定されている場合）
    - ステージング環境: `{vercelUrl}`（context から取得）
    - 本番環境: `{vercelUrl}`（context から取得）
    - ワイルドカードパターンは使用しない（セキュリティ強化）
    - Lambda 関数の環境変数 `ALLOWED_ORIGINS` を更新
    - _要件: 3.1, 3.2_
  - [x] 3.3 API Gateway の CORS 設定を更新
    - `httpApi` の `corsPreflight` 設定を更新
    - `allowOrigins` を動的に設定
    - `allowMethods`, `allowHeaders`, `allowCredentials` を設定
    - _要件: 3.1, 3.2, 3.3, 3.4_
  - [x]\* 3.4 CDK スタックのスナップショットテストを更新
    - `packages/infra/test/vote-board-game-stack.test.ts` を更新
    - フロントエンド関連リソースが削除されていることを確認
    - バックエンドリソースが保持されていることを確認
    - _要件: 4.4, 4.5_

- [x] 4. チェックポイント - CDK デプロイの確認
  - すべてのテストが通過することを確認
  - ユーザーに質問があれば確認

- [ ] 5. GitHub Actions ワークフローの更新
  - [x] 5.1 deploy-reusable.yml からフロントエンド関連ステップを削除
    - `.github/workflows/deploy-reusable.yml` を更新
    - "Build Web with API URL" ステップを削除
    - "Deploy Web to S3" ステップを削除
    - "Invalidate CloudFront cache" ステップを削除
    - "Extract CDK Outputs" からフロントエンド関連の出力を削除
    - _要件: 5.1, 5.2, 5.3, 5.4_
  - [x] 5.2 CDK デプロイコマンドに Vercel URL を渡すように更新
    - `.github/workflows/deploy-reusable.yml` の CDK デプロイステップを更新
    - `--context vercelUrl=${{ vars.VERCEL_URL }}` を追加（`vercelProductionUrl` から変更）
    - GitHub Variables から Vercel URL を取得
    - 各環境（production, staging, development）に `VERCEL_URL` を設定
    - _要件: 3.1, 3.2_
  - [ ] 5.3 Vercel 環境変数ファイルを生成するステップを追加
    - `.github/workflows/deploy-reusable.yml` に新しいステップを追加
    - CDK Outputs から API URL と Cognito 設定を取得
    - `.env.production` ファイルを生成（本番環境用）
    - `.env.preview` ファイルを生成（プレビュー環境用）
    - 生成したファイルをアーティファクトとしてアップロード
    - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 5.4 cd-production.yml の E2E テストステップを更新
    - `.github/workflows/cd-production.yml` を更新
    - GitHub Variables から Vercel URL を取得
    - `BASE_URL` 環境変数を Vercel URL に設定
    - _要件: 5.5_

- [ ] 6. ドキュメントの更新
  - [ ] 6.1 デプロイ手順のドキュメントを作成
    - `docs/deployment-vercel.md` を作成
    - Vercel プロジェクトの作成手順を記載
    - GitHub Variables の設定手順を記載（`VERCEL_PRODUCTION_URL`）
    - GitHub Actions から生成される環境変数ファイルのダウンロード手順を記載
    - Vercel への環境変数インポート手順を記載
    - デプロイの検証手順を記載
    - ロールバック手順を記載
    - トラブルシューティングを記載
    - _要件: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 6.2 README.md を更新
    - プロジェクトルートの `README.md` を更新
    - Vercel デプロイに関する情報を追加
    - GitHub Variables の設定方法を記載
    - 環境変数の自動生成とインポート方法を記載
    - S3 + CloudFront に関する古い情報を削除
    - _要件: 8.1_

- [ ] 7. チェックポイント - 最終確認
  - すべてのテストが通過することを確認
  - ユーザーに質問があれば確認

## 手動作業（実装後に実施）

以下の手動作業は、コード実装完了後にユーザーが実施する必要があります：

### Vercel プロジェクトの設定

1. Vercel にログイン: https://vercel.com
2. "Add New Project" をクリック
3. GitHub リポジトリを選択: `vote-board-game`
4. プロジェクト設定:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`
   - **Node.js Version**: 24.x

### GitHub Variables の設定

GitHub リポジトリに Vercel URL を各環境ごとに設定:

1. GitHub リポジトリ → Settings → Environments
2. 各環境（production, staging, development）を作成または選択
3. Environment variables を追加:
   - **Production 環境**:
     - Name: `VERCEL_URL`
     - Value: `https://vote-board-game-web.vercel.app`
   - **Staging 環境**:
     - Name: `VERCEL_URL`
     - Value: `https://vote-board-game-web-stg.vercel.app`
   - **Development 環境**:
     - Name: `VERCEL_URL`
     - Value: `https://vote-board-game-web-dev.vercel.app`

**注意**: 変数名は `VERCEL_URL` です（`VERCEL_PRODUCTION_URL` ではありません）。

### 環境変数の設定

GitHub Actions のデプロイ完了後、以下の手順で環境変数を設定します：

1. GitHub Actions の Artifacts から `.env.production` と `.env.preview` をダウンロード
2. Vercel ダッシュボード → Settings → Environment Variables
3. **Production 環境**: `.env.production` の内容をインポート
4. **Preview 環境**: `.env.preview` の内容をインポート

**生成される環境変数の例:**

```env
# .env.production
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.ap-northeast-1.amazonaws.com
NEXT_PUBLIC_APP_URL=https://vote-board-game-web.vercel.app
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-northeast-1

# .env.preview
NEXT_PUBLIC_API_URL=https://xxxxx-dev.execute-api.ap-northeast-1.amazonaws.com
NEXT_PUBLIC_APP_URL=https://$VERCEL_URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
```

### AWS CDK のデプロイ

```bash
cd packages/infra

# 開発環境にデプロイ
pnpm cdk deploy --context appName=vbg --context environment=dev --context vercelUrl=https://vote-board-game-web-dev.vercel.app

# 本番環境にデプロイ
pnpm cdk deploy --context appName=vbg --context environment=prod --context vercelUrl=https://vote-board-game-web.vercel.app
```

pnpm cdk deploy --context appName=vbg --context environment=prod --context vercelProductionUrl=https://vote-board-game-web.vercel.app

```

### デプロイの検証

1. Vercel ダッシュボードでデプロイ状況を確認
2. デプロイが完了したら、本番 URL にアクセス
3. 動的ルートが正常に動作することを確認（例: `/games/[gameId]`）
4. API 通信が正常に動作することを確認
5. ブラウザのコンソールに CORS エラーがないことを確認

## 注意事項

- `*` マークのタスクはオプションで、スキップ可能です
- 各タスクは具体的な要件を参照しています
- チェックポイントで進捗を確認し、問題があれば早期に対処します
- 手動作業は実装完了後にユーザーが実施します
```
