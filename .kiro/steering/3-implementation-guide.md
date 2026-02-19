# 実装ガイド

## ブランチ運用

GitHub Flow を採用

- `main`: 本番環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

参考: [GitHub Flow](https://docs.github.com/ja/get-started/using-github/github-flow)

## コミットメッセージ

Conventional Commits に準拠

```text
<type>: <subject>

<body>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

参考: [Conventional Commits](https://www.conventionalcommits.org/ja/)

## フロントエンド

### Next.js

- App Router を使用
- Server Components を優先、Client Components は必要最小限
- `use client` は必要な場合のみ
- Hooks を使用（useState, useEffect, useContext など）
- カスタムフックで共通ロジックを抽出

参考: [Next.js App Router](https://nextjs.org/docs/app)

### TypeScript

- strict mode を有効化
- `any` は使用しない
- 型定義は `types/` ディレクトリに配置

参考: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Tailwind CSS

- ユーティリティクラスを使用
- カスタムクラスは最小限

参考: [Tailwind CSS](https://tailwindcss.com/docs)

### shadcn/ui

- コンポーネントは `components/ui/` に配置
- カスタマイズは最小限

参考: [shadcn/ui](https://ui.shadcn.com/docs)

## バックエンド

### Hono

- ルーティングは RESTful に
- ミドルウェアで共通処理を実装
- バリデーションは Zod を使用

参考: [Hono](https://hono.dev/docs/)

### Lambda

- ハンドラーは簡潔に
- ビジネスロジックは別ファイルに分離
- 環境変数で設定を管理

参考: [AWS Lambda Node.js](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)

## IaC

### 原則

- **AWS リソースの操作は必ず IaC（CDK）経由で実行**
- マネジメントコンソールでの手動操作は禁止
- AWS CLI での直接操作も禁止
- 例外: トラブルシューティング時の確認のみ許可（変更は不可）

### AWS CDK

- Stack は機能単位で分割
- Construct は再利用可能に
- Props で設定を外部化

参考: [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)

### cdk-nag

- デプロイ前に必ず実行
- 警告は無視せず対応

参考: [cdk-nag](https://github.com/cdklabs/cdk-nag)

## セキュリティ

### 認証・認可

- Cognito で認証
- JWT トークンで認可
- トークンは短命に（15 分）

### API

- CORS を適切に設定
- レート制限を実装
- 入力値は必ずバリデーション

### データ

- 個人情報は暗号化
- S3 バケットはプライベート
- DynamoDB は暗号化有効

参考: [AWS Security Best Practices](https://docs.aws.amazon.com/security/)

## データベース

### DynamoDB

- Single Table Design を採用
- PK/SK の命名規則を統一
- GSI は必要最小限

#### 命名規則

- PK: `<EntityType>#<ID>`
- SK: `<EntityType>#<ID>` または `<RelationType>#<ID>`

例:

```text
PK: USER#123
SK: USER#123

PK: GAME#456
SK: GAME#456

PK: GAME#456
SK: MOVE#789
```

参考: [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### データモデリング

- アクセスパターンを先に定義
- 結合は避ける（非正規化）
- トランザクションは最小限

参考: [DynamoDB Single Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
