# 技術スタック

## フロントエンド

### フレームワーク・ライブラリ

- **Next.js 16** (App Router)
  - React 19
  - TypeScript
  - Server Components / Client Components の適切な使い分け

### UI・スタイリング

- **Tailwind CSS**
  - レスポンシブデザイン対応
- **shadcn/ui**
  - アクセシブルなコンポーネント
- **Lucide React**
  - アイコンライブラリ

### 状態管理

- React Server Components を優先
- クライアント側の状態管理が必要な場合は React hooks (useState, useReducer)

### OGP画像生成

- **@vercel/og** または **satori**
  - 盤面のサムネイル画像を動的生成

## バックエンド

### API

- **AWS Lambda + Hono**
  - Lambda Function URLs または API Gateway
  - 型安全な API 設計
  - 軽量で高速なルーティング

### データベース

- **Amazon DynamoDB**
  - Single Table Design
  - On-Demand または Provisioned キャパシティ
  - GSI (Global Secondary Index) の活用

### データアクセス

- **AWS SDK v3** (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb)
  - 型安全なデータベースアクセス
  - DynamoDB Document Client

### 認証

- **Amazon Cognito**
  - ユーザー認証・認可
  - JWT トークン検証
  - ソーシャルログイン対応（将来的に）

## インフラ（AWS）

### フロントエンドインフラ基盤

- **Amazon S3**
  - Next.js の静的エクスポート（output: 'export'）
  - 静的ファイルホスティング
- **Amazon CloudFront**
  - CDN による高速配信
  - カスタムドメイン対応
  - HTTPS 対応
  - キャッシュ戦略

### APIインフラ基盤

- **Amazon API Gateway** (HTTP API)
  - RESTful API エンドポイント
  - Lambda 統合
  - CORS 設定
  - カスタムドメイン
- **AWS Lambda**
  - Hono アプリケーションのホスティング
  - 自動スケーリング
  - コールドスタート最適化

### バッチ処理

- **AWS Lambda**
  - 投票集計（日次バッチ）
  - 次の一手候補のAI生成
  - 対局状態の更新

### スケジューラー

- **Amazon EventBridge Scheduler**
  - 日次バッチのトリガー（JST 0:00）
  - cron 式による柔軟なスケジューリング

### ストレージ

- **Amazon S3**
  - OGP画像のキャッシュ
  - バックアップデータ

### AI・機械学習

- **Amazon Bedrock** (Nova Pro)
  - 次の一手候補の生成
  - 対局解説の生成
  - コスト効率の良いモデル選定
  - プロンプトエンジニアリング

### DNS

- **Amazon Route 53**
  - ドメイン管理
  - DNS レコード管理
  - ヘルスチェック

### モニタリング

- **Amazon CloudWatch**
  - ログ管理（Lambda Logs）
  - メトリクス監視
  - アラート設定
- **AWS X-Ray**
  - 分散トレーシング
  - パフォーマンス分析

## 開発環境

### パッケージマネージャー

- **pnpm**

### コード品質

- **ESLint**
  - Next.js 推奨設定
- **Prettier**
  - コードフォーマット
- **TypeScript**
  - 厳格な型チェック (strict mode)

### テスト

- **Vitest**
  - ユニットテスト
- **Playwright**
  - E2Eテスト（MVP後）

### Git

- **GitHub**
  - ソースコード管理
  - GitHub Actions for CI/CD

## CI/CD

### パイプライン

- **GitHub Actions**
  - Lint / Type Check
  - テスト実行
  - ビルド
  - デプロイ

### IaC

- **AWS CDK** (TypeScript)
  - インフラのコード管理
  - スタック管理
- **cdk-nag**
  - セキュリティベストプラクティスのチェック
  - AWS Solutions や NIST 800-53 準拠の検証
  - デプロイ前のセキュリティ検証

## MVP での技術選定の理由

- **Next.js 16 (Static Export)**: SSG による高速表示、OGP対応の容易さ、最新機能
- **S3 + CloudFront**: 静的ホスティングで低コスト、高速配信、スケーラブル
- **API Gateway + Lambda + Hono**: サーバーレスで低コスト、型安全、高速なAPI構築
- **DynamoDB**: スキーマレスで柔軟、完全マネージド、低レイテンシ、従量課金
- **AWS CDK**: TypeScript でインフラをコード管理、型安全
- **Bedrock (Nova Pro)**: コスト効率の良い AI モデルで候補生成・解説生成
- **EventBridge Scheduler**: 日次バッチ処理のシンプルな実装

## 将来的な拡張性

- ゲーム種類の追加（チェス、囲碁、将棋）
- 集合知 vs 集合知の対局
- 専門用語解説ページ
