# 設計書: Vercel フロントエンドデプロイ

## 概要

Next.js フロントエンドアプリケーションを AWS S3 + CloudFront から Vercel に移行します。現在の静的エクスポート方式では動的ルート（`[gameId]`, `[candidateId]`）が正常に動作しないため、Vercel の SSR/ISR 機能を活用してこの問題を解決します。

### 移行の背景

- 現状: Next.js の `output: 'export'` で静的エクスポートし、S3 + CloudFront でホスティング
- 問題: 動的ルートが 404 エラーになる（S3 は動的ルーティングをサポートしない）
- 解決策: Vercel にデプロイして SSR/ISR を有効化

### 移行のメリット

1. 動的ルートの完全サポート
2. SSR/ISR による柔軟なレンダリング戦略
3. Vercel の自動デプロイとプレビュー機能
4. Next.js との完全な互換性
5. インフラ管理の簡素化

## アーキテクチャ

### 現在のアーキテクチャ

```text
GitHub Actions
  ↓ (build & deploy)
S3 Bucket (静的ファイル)
  ↓
CloudFront (CDN)
  ↓
ユーザー
```

### 新しいアーキテクチャ

```text
GitHub
  ↓ (push)
Vercel (自動デプロイ)
  ↓ (SSR/ISR)
ユーザー
  ↓ (API リクエスト)
API Gateway + Lambda (バックエンド)
```

### コンポーネント間の通信

- Vercel → API Gateway: HTTPS 経由で API リクエスト
- API Gateway: CORS 設定で Vercel ドメインを許可
- GitHub → Vercel: Git push で自動デプロイトリガー

## コンポーネントとインターフェース

### 1. Vercel プロジェクト

#### 設定項目

- **Framework Preset**: Next.js
- **Root Directory**: `packages/web`
- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`
- **Node.js Version**: 24.x

#### 環境変数

**Production 環境:**

- `NEXT_PUBLIC_API_URL`: API Gateway のエンドポイント URL
- `NEXT_PUBLIC_APP_URL`: `https://vote-board-game-web.vercel.app`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Cognito ユーザープール ID
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Cognito クライアント ID
- `NEXT_PUBLIC_AWS_REGION`: `ap-northeast-1`

**Preview 環境:**

- `NEXT_PUBLIC_API_URL`: API Gateway のエンドポイント URL（開発環境）
- `NEXT_PUBLIC_APP_URL`: `https://$VERCEL_URL`（Vercel が自動設定）
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: Cognito ユーザープール ID（開発環境）
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`: Cognito クライアント ID（開発環境）
- `NEXT_PUBLIC_AWS_REGION`: `ap-northeast-1`

### 2. CORS 設定（API Gateway）

#### 更新内容

現在の CORS 設定を拡張して Vercel ドメインを許可します。

**セキュリティアプローチ:**

ワイルドカードパターン（`https://*.vercel.app`）は使用せず、GitHub Actions の環境変数から取得した明示的な Vercel URL のみを許可します。

**許可するオリジン:**

- Development: `http://localhost:3000` + Vercel URL（環境変数から取得）
- Staging: Vercel URL（環境変数から取得）
- Production: Vercel URL（環境変数から取得）

**実装方法:**

Lambda 関数の環境変数 `ALLOWED_ORIGINS` を更新:

```typescript
// packages/infra/lib/vote-board-game-stack.ts
// Vercel URL を CDK context から取得
const vercelUrl = this.node.tryGetContext('vercelUrl') || '';

const allowedOrigins = (() => {
  switch (environment) {
    case 'dev':
      return vercelUrl ? `http://localhost:3000,${vercelUrl}` : 'http://localhost:3000';
    case 'stg':
      return vercelUrl || '';
    case 'prod':
      return vercelUrl || '';
    default:
      return 'http://localhost:3000';
  }
})();
```

**GitHub Actions での設定:**

環境変数 `VERCEL_URL` を各 GitHub Environment（production, staging, development）に設定し、CDK デプロイ時に渡します:

```yaml
- name: Deploy CDK Stack
  run: |
    pnpm cdk deploy \
      --context appName=vbg \
      --context environment=${{ inputs.environment }} \
      --context vercelUrl=${{ vars.VERCEL_URL }} \
      --require-approval never
```

API 側で動的に CORS ヘッダーを設定:

```typescript
// packages/api/src/middleware/cors.ts
export const corsMiddleware = (allowedOrigins: string) => {
  const origins = allowedOrigins.split(',');

  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');

    if (origin && isOriginAllowed(origin, origins)) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
    }

    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      c.header('Access-Control-Max-Age', '3600');
      return c.text('', 204);
    }

    await next();
  };
};

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((allowed) => allowed === origin);
}
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });
}
```

### 3. AWS CDK スタックの更新

#### 削除するリソース

以下のリソースを CDK スタックから削除します:

1. **Web S3 Bucket** (`webBucket`)
   - フロントエンド静的ファイル用のバケット
   - 関連する CORS 設定
   - 関連する CloudFront OAC

2. **Web CloudFront Distribution** (`distribution`)
   - フロントエンド配信用の CDN
   - 関連するキャッシュポリシー
   - 関連するログ設定

3. **CloudFormation Outputs**
   - `WebBucketName`
   - `DistributionId`
   - `DistributionDomainName`

#### 保持するリソース

以下のリソースは変更なしで保持:

- DynamoDB テーブル
- Cognito ユーザープール
- API Lambda 関数
- Batch Lambda 関数
- API Gateway HTTP API
- EventBridge Scheduler
- Icon S3 Bucket と CloudFront Distribution
- CloudWatch ダッシュボードとアラーム
- IAM ロール

#### 具体的な変更内容

```typescript
// packages/infra/lib/vote-board-game-stack.ts

// 削除: webBucket の定義
// 削除: distribution の定義
// 削除: frontendOrigin の計算
// 削除: iconBucket の CORS 設定（frontendOrigin 依存）

// Vercel URL を CDK context から取得
const vercelProductionUrl = this.node.tryGetContext('vercelProductionUrl') || '';

// 更新: allowedOrigins の設定
const allowedOrigins = (() => {
  switch (environment) {
    case 'dev':
      return 'http://localhost:3000,https://*.vercel.app';
    case 'stg':
      return 'https://vote-board-game-web-stg.vercel.app,https://*.vercel.app';
    case 'prod':
      return vercelProductionUrl
        ? `${vercelProductionUrl},https://*.vercel.app`
        : 'https://*.vercel.app';
    default:
      return 'http://localhost:3000';
  }
})();

// 更新: API Gateway の CORS 設定
const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
  apiName: `${appName}-${environment}-apigateway-main`,
  description: `Vote Board Game API - ${environment}`,
  corsPreflight: {
    allowOrigins: allowedOrigins.split(','),
    allowMethods: [
      apigatewayv2.CorsHttpMethod.GET,
      apigatewayv2.CorsHttpMethod.POST,
      apigatewayv2.CorsHttpMethod.PUT,
      apigatewayv2.CorsHttpMethod.PATCH,
      apigatewayv2.CorsHttpMethod.DELETE,
      apigatewayv2.CorsHttpMethod.OPTIONS,
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true,
    maxAge: cdk.Duration.hours(1),
  },
});

// 削除: CloudFormation Outputs
// - WebBucketName
// - DistributionId
// - DistributionDomainName
```

### 4. GitHub Actions ワークフローの更新

#### 削除するステップ

`deploy-reusable.yml` から以下のステップを削除:

1. **Build Web with API URL**

```yaml
- name: Build Web with API URL
  working-directory: packages/web
  run: pnpm build
  env:
    NEXT_PUBLIC_API_URL: ${{ steps.cdk-outputs.outputs.api-url }}
```

2. **Deploy Web to S3**

   ```yaml
   - name: Deploy Web to S3
     run: |
       aws s3 sync packages/web/out s3://${{ steps.cdk-outputs.outputs.bucket-name }} --delete
   ```

3. **Invalidate CloudFront cache**

   ```yaml
   - name: Invalidate CloudFront cache
     run: |
       aws cloudfront create-invalidation --distribution-id ${{ steps.cdk-outputs.outputs.distribution-id }} --paths "/*"
   ```

4. **Extract CDK Outputs の一部**
   ```yaml
   BUCKET_NAME=$(jq -r '.[] | .WebBucketName' packages/infra/cdk-outputs.json)
   DISTRIBUTION_ID=$(jq -r '.[] | .DistributionId' packages/infra/cdk-outputs.json)
   DOMAIN_NAME=$(jq -r '.[] | .DistributionDomainName' packages/infra/cdk-outputs.json)
   CLOUDFRONT_URL="https://${DOMAIN_NAME}"
   ```

#### 追加するステップ

`deploy-reusable.yml` に以下のステップを追加:

**環境変数ファイルの生成とアップロード**

```yaml
- name: Generate Vercel environment files
  run: |
    # CDK outputs から値を取得
    API_URL=$(jq -r '.[] | .ApiUrl' packages/infra/cdk-outputs.json)
    COGNITO_USER_POOL_ID=$(jq -r '.[] | .CognitoUserPoolId' packages/infra/cdk-outputs.json)
    COGNITO_CLIENT_ID=$(jq -r '.[] | .CognitoClientId' packages/infra/cdk-outputs.json)

    # .env.production を生成
    cat > .env.production << EOF
    NEXT_PUBLIC_API_URL=${API_URL}
    NEXT_PUBLIC_APP_URL=https://vote-board-game-web.vercel.app
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
    NEXT_PUBLIC_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
    NEXT_PUBLIC_AWS_REGION=ap-northeast-1
    EOF

    # .env.preview を生成
    cat > .env.preview << EOF
    NEXT_PUBLIC_API_URL=${API_URL}
    NEXT_PUBLIC_APP_URL=https://\$VERCEL_URL
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
    NEXT_PUBLIC_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
    NEXT_PUBLIC_AWS_REGION=ap-northeast-1
    EOF

- name: Upload environment files as artifacts
  uses: actions/upload-artifact@v4
  with:
    name: vercel-env-files-${{ github.run_id }}
    path: |
      .env.production
      .env.preview
    retention-days: 30
```

#### CDK デプロイステップの更新

CDK デプロイコマンドに Vercel URL を渡すように更新:

```yaml
- name: Deploy CDK Stack
  run: |
    pnpm cdk deploy \
      --context appName=vbg \
      --context environment=${{ inputs.environment }} \
      --context vercelProductionUrl=${{ vars.VERCEL_PRODUCTION_URL }} \
      --require-approval never \
      --outputs-file packages/infra/cdk-outputs.json
```

#### 保持するステップ

- AWS 認証
- CDK デプロイ（インフラとバックエンド）
- API ヘルスチェック
- デプロイサマリー（フロントエンド関連の出力を削除）

#### E2E テストの更新

`cd-production.yml` の E2E テストステップを更新:

```yaml
- name: Get Vercel URL
  id: vercel-url
  run: |
    # GitHub Variables から Vercel の本番 URL を取得
    VERCEL_URL="${{ vars.VERCEL_PRODUCTION_URL }}"
    echo "url=$VERCEL_URL" >> $GITHUB_OUTPUT
    echo "Vercel URL: $VERCEL_URL"

- name: Run E2E tests
  run: pnpm --filter @vote-board-game/web test:e2e
  env:
    BASE_URL: ${{ steps.vercel-url.outputs.url }}
```

### 5. Next.js 設定の更新

#### next.config.ts の変更

```typescript
// packages/web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vote-board-game/shared'],
  // 削除: output: 'export' を削除して SSR/ISR を有効化

  // 画像最適化の設定（Vercel のデフォルトを使用）
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
```

#### ISR の設定（オプション）

特定のページで ISR を有効化する場合:

```typescript
// packages/web/src/app/games/[gameId]/page.tsx
export const revalidate = 60; // 60秒ごとに再生成
```

## データモデル

データモデルの変更はありません。既存の DynamoDB スキーマをそのまま使用します。

## 正確性プロパティ

_プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。_

### Property 1: CORS ヘッダーの許可

_任意の_ 許可されたオリジン（Vercel 本番ドメイン、プレビュードメイン、localhost）からの API リクエストに対して、API は適切な CORS ヘッダーを返す必要があります。

検証: 要件 3.1, 3.2

### Property 2: HTTP メソッドの許可

_任意の_ 必要な HTTP メソッド（GET, POST, PUT, DELETE, OPTIONS）に対して、CORS 設定はそのメソッドを許可する必要があります。

検証: 要件 3.3

### Property 3: ヘッダーの許可

_任意の_ 必要なヘッダー（Content-Type, Authorization）を含むリクエストに対して、CORS 設定はそのヘッダーを許可する必要があります。

検証: 要件 3.4

### Property 4: プリフライトリクエストの処理

_任意の_ プリフライトリクエスト（OPTIONS メソッド）に対して、API は適切な CORS ヘッダーを含む 204 レスポンスを返す必要があります。

検証: 要件 3.5

### Property 5: 動的ルートのレンダリング

_任意の_ 有効な動的ルートパラメータ（gameId, candidateId）に対して、フロントエンドアプリケーションは正しいページをレンダリングする必要があります。

検証: 要件 6.5, 7.2

### Property 6: API 通信の成功

_任意の_ API エンドポイントに対して、フロントエンドアプリケーションは正常に通信できる必要があります（CORS エラーなし）。

検証: 要件 7.3

## エラーハンドリング

### 1. CORS エラー

**エラーケース:**

- 許可されていないオリジンからのリクエスト
- 許可されていない HTTP メソッド
- 許可されていないヘッダー

**ハンドリング:**

- API 側でオリジンをチェックし、許可されていない場合は CORS ヘッダーを返さない
- ブラウザが CORS エラーを表示
- フロントエンド側でエラーメッセージを表示

### 2. デプロイエラー

**エラーケース:**

- Vercel デプロイの失敗
- ビルドエラー
- 環境変数の設定ミス

**ハンドリング:**

- Vercel のデプロイログを確認
- GitHub の通知で失敗を検知
- ロールバック機能を使用して前のバージョンに戻す

### 3. API 接続エラー

**エラーケース:**

- API Gateway のエンドポイントが間違っている
- ネットワークエラー
- API のタイムアウト

**ハンドリング:**

- フロントエンド側でリトライロジックを実装
- エラーメッセージをユーザーに表示
- CloudWatch でエラーを監視

## テスト戦略

### ユニットテストとプロパティベーステストの併用

- **ユニットテスト**: 特定の例、エッジケース、エラー条件を検証
- **プロパティテスト**: すべての入力にわたる普遍的なプロパティを検証
- 両方を組み合わせることで包括的なカバレッジを実現

### ユニットテスト

#### CORS ミドルウェアのテスト

```typescript
// packages/api/src/middleware/cors.test.ts
import { describe, it, expect } from 'vitest';
import { corsMiddleware } from './cors';

describe('CORS Middleware', () => {
  it('should allow requests from Vercel production domain', async () => {
    const allowedOrigins = 'https://vote-board-game-web.vercel.app';
    const middleware = corsMiddleware(allowedOrigins);

    const mockContext = {
      req: { header: () => 'https://vote-board-game-web.vercel.app', method: 'GET' },
      header: vi.fn(),
    };

    await middleware(mockContext as any, async () => {});

    expect(mockContext.header).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://vote-board-game-web.vercel.app'
    );
  });

  it('should allow requests from Vercel preview domains', async () => {
    const allowedOrigins = 'https://*.vercel.app';
    const middleware = corsMiddleware(allowedOrigins);

    const mockContext = {
      req: { header: () => 'https://my-preview-abc123.vercel.app', method: 'GET' },
      header: vi.fn(),
    };

    await middleware(mockContext as any, async () => {});

    expect(mockContext.header).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://my-preview-abc123.vercel.app'
    );
  });

  it('should handle preflight requests', async () => {
    const allowedOrigins = 'https://vote-board-game-web.vercel.app';
    const middleware = corsMiddleware(allowedOrigins);

    const mockContext = {
      req: { header: () => 'https://vote-board-game-web.vercel.app', method: 'OPTIONS' },
      header: vi.fn(),
      text: vi.fn(),
    };

    await middleware(mockContext as any, async () => {});

    expect(mockContext.header).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    expect(mockContext.text).toHaveBeenCalledWith('', 204);
  });

  it('should reject requests from unauthorized origins', async () => {
    const allowedOrigins = 'https://vote-board-game-web.vercel.app';
    const middleware = corsMiddleware(allowedOrigins);

    const mockContext = {
      req: { header: () => 'https://malicious-site.com', method: 'GET' },
      header: vi.fn(),
    };

    await middleware(mockContext as any, async () => {});

    expect(mockContext.header).not.toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      expect.anything()
    );
  });
});
```

### プロパティベーステスト

fast-check を使用してプロパティテストを実装します。

#### CORS プロパティテスト

```typescript
// packages/api/src/middleware/cors.property.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { corsMiddleware, isOriginAllowed } from './cors';

describe('CORS Middleware Properties', () => {
  /**
   * Feature: vercel-frontend-deployment, Property 1: CORS ヘッダーの許可
   * 任意の許可されたオリジンからのリクエストに対して、適切な CORS ヘッダーを返す
   */
  it('Property 1: should allow all requests from allowed origins', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://vote-board-game-web.vercel.app',
          'https://preview-abc123.vercel.app',
          'https://preview-xyz789.vercel.app',
          'http://localhost:3000'
        ),
        (origin) => {
          const allowedOrigins =
            'https://vote-board-game-web.vercel.app,https://*.vercel.app,http://localhost:3000';
          const result = isOriginAllowed(origin, allowedOrigins.split(','));
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100, endOnFailure: true }
    );
  });

  /**
   * Feature: vercel-frontend-deployment, Property 2: HTTP メソッドの許可
   * 任意の必要な HTTP メソッドに対して、CORS 設定はそのメソッドを許可する
   */
  it('Property 2: should allow all required HTTP methods', () => {
    fc.assert(
      fc.property(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'), async (method) => {
        const allowedOrigins = 'https://vote-board-game-web.vercel.app';
        const middleware = corsMiddleware(allowedOrigins);

        const mockContext = {
          req: { header: () => 'https://vote-board-game-web.vercel.app', method },
          header: vi.fn(),
          text: vi.fn(),
        };

        await middleware(mockContext as any, async () => {});

        // CORS ヘッダーが設定されていることを確認
        expect(mockContext.header).toHaveBeenCalled();
      }),
      { numRuns: 100, endOnFailure: true }
    );
  });

  /**
   * Feature: vercel-frontend-deployment, Property 4: プリフライトリクエストの処理
   * 任意のプリフライトリクエストに対して、適切な CORS ヘッダーを含む 204 レスポンスを返す
   */
  it('Property 4: should handle all preflight requests correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'https://vote-board-game-web.vercel.app',
          'https://preview-test.vercel.app'
        ),
        async (origin) => {
          const allowedOrigins = 'https://vote-board-game-web.vercel.app,https://*.vercel.app';
          const middleware = corsMiddleware(allowedOrigins);

          const mockContext = {
            req: { header: () => origin, method: 'OPTIONS' },
            header: vi.fn(),
            text: vi.fn(),
          };

          await middleware(mockContext as any, async () => {});

          // プリフライトレスポンスの検証
          expect(mockContext.header).toHaveBeenCalledWith(
            'Access-Control-Allow-Methods',
            expect.stringContaining('OPTIONS')
          );
          expect(mockContext.text).toHaveBeenCalledWith('', 204);
        }
      ),
      { numRuns: 100, endOnFailure: true }
    );
  });
});
```

### E2E テスト

Playwright を使用して、Vercel にデプロイされたアプリケーションの E2E テストを実行します。

```typescript
// packages/web/e2e/vercel-deployment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Vercel Deployment', () => {
  test('should be accessible via HTTPS', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toMatch(/^https:\/\//);
  });

  test('should render dynamic routes correctly', async ({ page }) => {
    // ゲーム詳細ページにアクセス
    await page.goto('/games/test-game-id');

    // ページが正しくレンダリングされることを確認
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should communicate with API successfully', async ({ page }) => {
    // API リクエストを監視
    const apiRequest = page.waitForResponse(
      (response) => response.url().includes('/api/') && response.status() === 200
    );

    await page.goto('/');
    await apiRequest;

    // CORS エラーがないことを確認
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    expect(consoleErrors.filter((e) => e.includes('CORS'))).toHaveLength(0);
  });
});
```

### テスト設定

#### Vitest 設定

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 15000, // プロパティテストのタイムアウト
  },
});
```

#### プロパティテストの設定

- `numRuns`: 10-20（JSDOM 環境での安定性のため）
- `endOnFailure`: true（失敗時に即座に停止）
- タイムアウト: 15秒

## デプロイ手順

### 1. Vercel プロジェクトの作成

1. Vercel にログイン: <https://vercel.com>
2. "Add New Project" をクリック
3. GitHub リポジトリを選択: `vote-board-game`
4. プロジェクト設定:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

### 2. 環境変数の設定

#### Production 環境

Vercel ダッシュボード → Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.ap-northeast-1.amazonaws.com
NEXT_PUBLIC_APP_URL=https://vote-board-game-web.vercel.app
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
```

#### Preview 環境

```env
NEXT_PUBLIC_API_URL=https://your-dev-api-gateway-url.execute-api.ap-northeast-1.amazonaws.com
NEXT_PUBLIC_APP_URL=https://$VERCEL_URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
```

### 3. GitHub Variables の設定

GitHub リポジトリに Vercel URL を設定:

1. GitHub リポジトリ → Settings → Secrets and variables → Actions → Variables
2. "New repository variable" をクリック
3. 変数を追加:
   - Name: `VERCEL_PRODUCTION_URL`
   - Value: `https://vote-board-game-web.vercel.app`

### 4. CDK スタックのデプロイ

```bash
cd packages/infra

# 開発環境にデプロイ
pnpm cdk deploy --context appName=vbg --context environment=dev --context vercelProductionUrl=https://vote-board-game-web.vercel.app

# 本番環境にデプロイ
pnpm cdk deploy --context appName=vbg --context environment=prod --context vercelProductionUrl=https://vote-board-game-web.vercel.app
```

### 5. ワークフローの更新

1. `deploy-reusable.yml` を編集してフロントエンド関連のステップを削除
2. 環境変数ファイル生成ステップを追加
3. 変更をコミット・プッシュ
4. GitHub Actions が自動的に実行される

### 6. 環境変数ファイルのダウンロードとインポート

1. GitHub Actions のワークフロー実行ページにアクセス
2. Artifacts セクションから `vercel-env-files-{run_id}` をダウンロード
3. ダウンロードした `.env.production` と `.env.preview` を確認
4. Vercel ダッシュボード → Settings → Environment Variables
5. Production 環境: `.env.production` の内容をインポート
6. Preview 環境: `.env.preview` の内容をインポート

### 7. Vercel デプロイの確認

1. Vercel ダッシュボードでデプロイ状況を確認
2. デプロイが完了したら、本番 URL にアクセス
3. 動的ルートが正常に動作することを確認
4. API 通信が正常に動作することを確認

### 8. DNS 設定（オプション）

カスタムドメインを使用する場合:

1. Vercel ダッシュボード → Settings → Domains
2. カスタムドメインを追加
3. DNS レコードを設定（Vercel が指示を表示）
4. SSL 証明書が自動的に発行される

## ロールバック手順

### Vercel でのロールバック

1. Vercel ダッシュボード → Deployments
2. ロールバックしたいデプロイメントを選択
3. "Promote to Production" をクリック

### AWS リソースのロールバック

```bash
cd packages/infra

# 前のバージョンの CDK スタックをデプロイ
git checkout <previous-commit>
pnpm cdk deploy --context appName=vbg --context environment=prod
```

## トラブルシューティング

### 問題 1: CORS エラーが発生する

**症状:**

- ブラウザのコンソールに CORS エラーが表示される
- API リクエストが失敗する

**解決策:**

1. API Gateway の CORS 設定を確認
2. Lambda 関数の `ALLOWED_ORIGINS` 環境変数を確認
3. Vercel の環境変数 `NEXT_PUBLIC_API_URL` が正しいことを確認

### 問題 2: 動的ルートが 404 エラーになる

**症状:**

- `/games/[gameId]` などの動的ルートにアクセスすると 404 エラー

**解決策:**

1. `next.config.ts` から `output: 'export'` が削除されていることを確認
2. Vercel のビルドログを確認
3. Vercel の Framework Preset が Next.js に設定されていることを確認

### 問題 3: 環境変数が反映されない

**症状:**

- `process.env.NEXT_PUBLIC_API_URL` が undefined

**解決策:**

1. Vercel ダッシュボードで環境変数が設定されていることを確認
2. 環境変数を更新した後、再デプロイが必要
3. 環境変数名が `NEXT_PUBLIC_` で始まっていることを確認

### 問題 4: ビルドが失敗する

**症状:**

- Vercel のビルドログにエラーが表示される

**解決策:**

1. ローカルで `pnpm build` を実行してエラーを確認
2. `pnpm install` が正常に実行されることを確認
3. Node.js のバージョンが 24.x であることを確認

## 参考資料

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [AWS API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [Hono CORS Middleware](https://hono.dev/middleware/builtin/cors)
