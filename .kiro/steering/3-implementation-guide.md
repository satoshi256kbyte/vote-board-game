# 実装ガイド

## ブランチ運用

GitHub Flow を採用

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

### Kiro（AI アシスタント）の Git 操作ルール

**禁止事項:**

- ブランチの切り替え（`git checkout`、`git switch`）は禁止
- `main` ブランチへの直接プッシュは禁止
- `main` ブランチへのマージは禁止

**許可される操作:**

- 現在のブランチへのコミット
- 現在のブランチへのプッシュ
- ファイルの作成・編集・削除

**ワークフロー:**

1. ユーザーが適切なブランチに切り替える
2. Kiro がそのブランチで作業（コミット・プッシュ）
3. `main` へのマージはユーザーが Pull Request 経由で実施

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

### フロントエンドテスト

- Vitest でユニットテスト・統合テストを実装
- React Testing Library でコンポーネントテスト
- Server Components と Client Components で異なるテスト戦略

#### テストの種類

**ユーティリティ関数のテスト**

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from './date-utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01');
    expect(formatDate(date)).toBe('2024年1月1日');
  });
});
```

**Client Component のテスト**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteButton } from './vote-button';

describe('VoteButton', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<VoteButton onClick={handleClick}>投票</VoteButton>);

    fireEvent.click(screen.getByText('投票'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**カスタムフックのテスト**

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVote } from './use-vote';

describe('useVote', () => {
  it('should toggle vote state', () => {
    const { result } = renderHook(() => useVote());

    expect(result.current.isVoted).toBe(false);

    act(() => {
      result.current.vote('candidate-1');
    });

    expect(result.current.isVoted).toBe(true);
  });
});
```

参考: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/react)

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

### バックエンドテスト

- Vitest でユニットテスト・統合テストを実装
- Hono のテストヘルパーを活用
- DynamoDB はモックまたはローカル環境を使用

#### テストの種類

**API エンドポイントのテスト**

```typescript
import { describe, it, expect } from 'vitest';
import { app } from './index';

describe('GET /api/games', () => {
  it('should return games list', async () => {
    const res = await app.request('/api/games');

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('games');
    expect(Array.isArray(data.games)).toBe(true);
  });
});

describe('POST /api/votes', () => {
  it('should create a vote', async () => {
    const res = await app.request('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'game-1',
        candidateId: 'candidate-1',
      }),
    });

    expect(res.status).toBe(201);
  });

  it('should return 400 for invalid data', async () => {
    const res = await app.request('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});
```

**ビジネスロジックのテスト**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameService } from './game-service';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';

describe('GameService', () => {
  let service: GameService;
  let mockDb: DynamoDBClient;

  beforeEach(() => {
    mockDb = {
      send: vi.fn(),
    } as any;
    service = new GameService(mockDb);
  });

  it('should get game by id', async () => {
    vi.mocked(mockDb.send).mockResolvedValue({
      Item: {
        PK: { S: 'GAME#1' },
        SK: { S: 'GAME#1' },
        status: { S: 'active' },
      },
    });

    const game = await service.getGame('1');
    expect(game).toBeDefined();
    expect(game?.status).toBe('active');
  });
});
```

**バリデーションのテスト**

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { voteSchema } from './schemas';

describe('voteSchema', () => {
  it('should validate correct vote data', () => {
    const data = {
      gameId: 'game-1',
      candidateId: 'candidate-1',
    };

    expect(() => voteSchema.parse(data)).not.toThrow();
  });

  it('should reject invalid vote data', () => {
    const data = {
      gameId: '',
      candidateId: 'candidate-1',
    };

    expect(() => voteSchema.parse(data)).toThrow();
  });
});
```

参考: [Hono Testing](https://hono.dev/docs/guides/testing), [Vitest](https://vitest.dev/)

## IaC

### 原則

- **AWS リソースの操作は必ず IaC（CDK）経由で実行**
- マネジメントコンソールでの手動操作は禁止
- AWS CLI での直接操作も禁止
- 例外: トラブルシューティング時の確認のみ許可（変更は不可）

### AWS リソース命名規則

AWS リソース名は以下の形式で統一する:

```text
<アプリ名>-<環境名>-<AWSサービス名>-<用途>
```

#### 環境名

- `dev`: 開発環境（development）
- `stg`: ステージング環境（staging）
- `prod`: 本番環境（production）

#### AWSサービス名

- `dynamodb`: DynamoDB テーブル
- `s3`: S3 バケット
- `lambda`: Lambda 関数
- `apigateway`: API Gateway
- `cloudfront`: CloudFront ディストリビューション
- `cognito`: Cognito ユーザープール
- `iam`: IAM ロール・ポリシー
- `cloudwatch`: CloudWatch ロググループ
- `eventbridge`: EventBridge ルール・スケジューラー

#### 命名例

```text
vbg-dev-dynamodb-main
vbg-prod-s3-web
vbg-stg-lambda-api
vbg-dev-apigateway-main
vbg-prod-cognito-main
vbg-dev-s3-logs
vbg-prod-cloudfront-web
vbg-dev-eventbridge-batch
```

#### 注意事項

- アプリ名は `vbg` で統一
- 全て小文字とハイフン（`-`）を使用
- アンダースコア（`_`）は使用しない
- 用途が明確な場合は省略可能（例: `vote-board-game-dev-dynamodb` のみでも可）
- リソース名の長さ制限に注意（S3 バケット名は 63 文字まで）

### AWS CDK

- Stack は機能単位で分割
- Construct は再利用可能に
- Props で設定を外部化

参考: [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)

### cdk-nag

- デプロイ前に必ず実行
- 警告は無視せず対応

参考: [cdk-nag](https://github.com/cdklabs/cdk-nag)

### CDK テスト

- スナップショットテストで CloudFormation テンプレートを検証
- Fine-grained assertions でリソースの詳細をテスト
- Validation tests でスタックの整合性を確認

#### テストの種類

**スナップショットテスト**

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack';

test('Stack snapshot', () => {
  const app = new cdk.App();
  const stack = new VoteBoardGameStack(app, 'TestStack');
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
```

**Fine-grained assertions**

```typescript
test('DynamoDB table created', () => {
  const app = new cdk.App();
  const stack = new VoteBoardGameStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
  });
});
```

**リソース数の検証**

```typescript
test('Lambda function count', () => {
  const app = new cdk.App();
  const stack = new VoteBoardGameStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Lambda::Function', 3);
});
```

参考: [CDK Testing](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)

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
