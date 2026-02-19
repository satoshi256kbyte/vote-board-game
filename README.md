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
