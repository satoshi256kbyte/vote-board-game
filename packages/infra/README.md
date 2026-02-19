# @vote-board-game/infra

AWS CDK によるインフラ定義

## 構成

- DynamoDB (Single Table Design)
- API Gateway + Lambda
- S3 + CloudFront
- Cognito
- EventBridge Scheduler
- Bedrock

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# ビルド
pnpm build

# AWS 認証情報の設定
aws configure

# CDK Bootstrap (初回のみ)
pnpm cdk bootstrap
```

## コマンド

```bash
# CloudFormation テンプレートの生成
pnpm synth

# デプロイ前の差分確認
pnpm diff

# デプロイ
pnpm deploy

# スタックの削除
pnpm destroy

# テスト実行
pnpm test

# テスト (watch モード)
pnpm test:watch

# 型チェック
pnpm type-check
```

## テスト

Vitest と CDK assertions を使用してインフラのテストを実装しています。

```bash
# テスト実行
pnpm test

# スナップショット更新
pnpm test -- -u
```

## cdk-nag

デプロイ前に cdk-nag によるセキュリティチェックが自動実行されます。

警告が出た場合は、適切に対応してください。

## 環境変数

```bash
# デプロイ先のAWSアカウント (オプション)
export CDK_DEFAULT_ACCOUNT=123456789012

# デプロイ先のリージョン (デフォルト: ap-northeast-1)
export CDK_DEFAULT_REGION=ap-northeast-1

# 環境名 (デフォルト: dev)
export ENVIRONMENT=dev
```

## 技術スタック

- AWS CDK
- cdk-nag
- TypeScript
- Vitest
