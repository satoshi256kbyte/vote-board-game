# @vote-board-game/api

Hono + AWS Lambda によるバックエンド API

## 構成

- Hono: 軽量で高速な Web フレームワーク
- AWS Lambda: サーバーレス実行環境
- DynamoDB: データベース
- Zod: バリデーション

## API エンドポイント

### ゲーム

- `GET /api/games` - ゲーム一覧取得
- `GET /api/games/:gameId` - ゲーム詳細取得
- `GET /api/games/:gameId/board` - 盤面取得
- `GET /api/games/:gameId/history` - 対局履歴取得

### 候補

- `GET /api/candidates?gameId=xxx` - 候補一覧取得
- `POST /api/candidates` - 候補投稿

### 投票

- `POST /api/votes` - 投票
- `GET /api/votes/my?gameId=xxx` - 自分の投票取得

### プロフィール

- `GET /api/profile` - プロフィール情報取得（認証必須）
- `PUT /api/profile` - プロフィール情報更新（認証必須）
- `POST /api/profile/icon/upload-url` - アイコンアップロード用 Presigned URL 生成（認証必須）

## 開発

```bash
# ビルド
pnpm build

# テスト
pnpm test

# 型チェック
pnpm type-check
```

## 環境変数

```bash
# DynamoDB テーブル名
TABLE_NAME=VoteBoardGame

# AWS リージョン
AWS_REGION=ap-northeast-1

# CORS 許可オリジン（カンマ区切り）
ALLOWED_ORIGINS=http://localhost:3000,https://example.com

# Cognito ユーザープール ID
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx

# S3 アイコンバケット名
ICON_BUCKET_NAME=vbg-dev-s3-icons

# CDN ドメイン（CloudFront）
CDN_DOMAIN=cdn.vote-board-game.example.com

# 環境
NODE_ENV=development
```

## デプロイ

AWS CDK により Lambda にデプロイされます。

```bash
# CDK デプロイ
pnpm --filter infra deploy
```
