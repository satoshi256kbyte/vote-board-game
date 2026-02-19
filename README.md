# 投票ボードゲーム (Vote Board Game)

投票形式のアブストラクト・ゲーム。AI vs 集合知で、1 日 1 回の投票により次の一手を決定していくゲームプラットフォームです。

## プロジェクト構成

モノレポ構成（pnpm workspaces）

```text
packages/
├── web/        # フロントエンド (Next.js 16)
├── api/        # バックエンド API (Hono + Lambda)
├── infra/      # インフラ (AWS CDK)
└── shared/     # 共通型定義・ユーティリティ
```

## ドキュメント

- [プロダクト概要](.kiro/steering/1-product-overview.md)
- [技術スタック](.kiro/steering/2-technology-stack.md)
- [実装ガイド](.kiro/steering/3-implementation-guide.md)
- [WBS](docs/1-wbs.md)
- [機能一覧](docs/2-feature-list.md)
- [テーブル設計](docs/3-table-design.md)
- [API設計](docs/4-api-design.md)
- [URL設計](docs/5-url-design.md)
- [ログ設計](docs/6-logging-design.md)
- [画面設計](docs/7-screen-design.md)

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# Git hooks のセットアップ
pnpm prepare
```

## 開発

```bash
# フロントエンド開発サーバー起動
pnpm dev

# 全パッケージのビルド
pnpm build

# 特定パッケージのビルド
pnpm build:web
pnpm build:api
pnpm build:infra
```

## コマンド

```bash
# Lint
pnpm lint
pnpm lint:fix

# 型チェック
pnpm type-check

# テスト
pnpm test

# フォーマット
pnpm format
pnpm format:check

# マークダウンリント
pnpm lint:md
pnpm lint:md:fix

# CDK
pnpm cdk synth
pnpm cdk deploy
pnpm cdk diff

# クリーンアップ
pnpm clean
```

## パッケージ詳細

### @vote-board-game/web

Next.js 16 + React 19 のフロントエンドアプリケーション

- App Router
- TypeScript strict mode
- Tailwind CSS + shadcn/ui

### @vote-board-game/api

Hono + AWS Lambda のバックエンド API

- RESTful API
- Zod バリデーション
- DynamoDB アクセス

### @vote-board-game/infra

AWS CDK によるインフラ定義

- TypeScript
- cdk-nag によるセキュリティチェック
- Stack 分割

### @vote-board-game/shared

共通型定義・ユーティリティ

- Zod スキーマ
- 型定義
- 定数

## ライセンス

ISC

## CI/CD

### GitHub Actions

このプロジェクトは GitHub Actions を使用した CI/CD パイプラインを採用しています。

#### CI (Continuous Integration)

`.github/workflows/ci.yml`

- すべてのブランチの push と pull request で実行
- Lint、型チェック、テスト、ビルドを実行
- ビルド成果物を artifact として保存（CD で再利用）
- 失敗時は CD パイプラインは実行されない

#### CD (Continuous Deployment)

環境ごとに分離されたデプロイパイプライン：

**Development環境** (`.github/workflows/cd-development.yml`)

- `develop` ブランチと `feature/**` ブランチの CI 成功後に自動実行
- Development環境へのデプロイ
- 個人開発・機能開発中の動作確認用
- 最も制約が緩い環境

**Staging環境** (`.github/workflows/cd-staging.yml`)

- `develop` ブランチの CI 成功後に自動実行
- Staging環境へのデプロイ
- 統合テスト・QA用
- Production環境に近い設定

**Production環境** (`.github/workflows/cd-production.yml`)

- `main` ブランチの CI 成功後に自動実行
- Production環境へのデプロイ
- 本番環境
- GitHub Environments 機能で保護可能（手動承認など）

**共通デプロイロジック** (`.github/workflows/deploy-reusable.yml`)

- Reusable Workflow として実装
- 環境ごとのYAMLから呼び出される
- デプロイロジックの一元管理

#### デプロイフロー

1. CI でビルドした成果物をダウンロード
2. AWS 認証（OIDC）
3. AWS Account ID を自動取得
4. インフラとAPIをデプロイ（CDK）
5. CDK Outputs から S3 バケット名と CloudFront Distribution ID を取得
6. フロントエンドをS3にデプロイ
   - HTMLファイル: `max-age=0`（常に最新）
   - JS/CSS等: `max-age=31536000`（1年間キャッシュ）
7. CloudFront キャッシュ無効化
8. デプロイサマリーを表示

### ブランチ戦略

- `main`: Production環境（本番）
- `develop`: Staging環境（検証）+ Development環境（開発）
- `feature/*`: Development環境（個人開発）

### AWS 認証設定

CD パイプラインは OIDC を使用した IAM ロール認証を使用します。

#### GitHub Environments の設定

各環境に対して GitHub Environments を作成し、環境ごとに`AWS_ROLE_ARN`を設定します。

**手順:**

1. GitHubリポジトリ > Settings > Environments
2. 以下の3つの環境を作成：
   - `development`
   - `staging`
   - `production`
3. 各環境に`AWS_ROLE_ARN` Secretを追加：
   - Development: `arn:aws:iam::123456789012:role/GitHubActionsDeployRole-Development`
   - Staging: `arn:aws:iam::123456789012:role/GitHubActionsDeployRole-Staging`
   - Production: `arn:aws:iam::123456789012:role/GitHubActionsDeployRole-Production`

**メリット:**

- 環境ごとに同じ変数名`AWS_ROLE_ARN`を使用
- 環境ごとに異なる保護ルールを設定可能
- Secretsの管理が簡潔

その他の情報（AWS Account ID、S3バケット名、CloudFront Distribution ID）は、デプロイ時に自動的に取得されます：

- AWS Account ID: `aws sts get-caller-identity` で取得
- S3バケット名: CDK Outputs から取得
- CloudFront Distribution ID: CDK Outputs から取得

#### GitHub Environments 設定（推奨）

環境ごとに保護ルールを設定することを推奨：

**Development環境**

- 保護なし（自動デプロイ）
- 開発者が自由にデプロイ可能

**Staging環境**

- 保護なし、または軽い制約
- 統合テスト用

**Production環境**

1. リポジトリ設定 > Environments
2. `production` 環境を作成
3. Protection rules を設定：
   - Required reviewers: デプロイ承認者を指定
   - Wait timer: デプロイ前の待機時間（オプション）
   - Deployment branches: `main` ブランチのみ許可

#### IAM ロールの作成

OIDC プロバイダーと IAM ロールを手動で作成する必要があります。

1. GitHub OIDC プロバイダーを AWS に追加
2. 環境ごとに以下のポリシーを持つ IAM ロールを作成：
   - CDK デプロイ権限（CloudFormation、IAM、Lambda等）
   - Lambda 更新権限
   - S3 書き込み権限
   - CloudFront キャッシュ無効化権限
3. 各ロールの ARN を対応する Secret に設定

詳細は [AWS ドキュメント](https://docs.github.com/ja/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) を参照してください。
