# 要件定義書

## はじめに

Next.js フロントエンドアプリケーションを Vercel にデプロイする機能を実装します。現在、動的ルート（`[gameId]`, `[candidateId]`）を使用しているため、AWS S3 + CloudFront での静的エクスポートができません。Vercel を使用することで、SSR/ISR 機能を活用し、動的ルートを正常に動作させ、デプロイを簡素化します。

## 用語集

- **Vercel**: Next.js の開発元が提供するホスティングプラットフォーム
- **Frontend_Application**: Next.js で構築されたフロントエンドアプリケーション
- **Backend_API**: AWS Lambda + Hono で構築されたバックエンド API
- **Deployment_System**: GitHub Actions と Vercel を組み合わせたデプロイシステム
- **CDK_Stack**: AWS CDK で定義されたインフラストラクチャスタック
- **Environment_Variables**: アプリケーションの実行環境で使用される設定値
- **CORS_Configuration**: Cross-Origin Resource Sharing の設定
- **Dynamic_Routes**: Next.js の動的ルーティング機能（例: `[gameId]`）
- **Vercel_Project**: Vercel プラットフォーム上のプロジェクト設定
- **GitHub_Actions_Workflow**: GitHub Actions で定義された CI/CD ワークフロー

## 要件

### 要件 1: Vercel プロジェクトの設定

**ユーザーストーリー:** 開発者として、Next.js アプリケーションを Vercel にデプロイできるようにしたい。そうすることで、動的ルートと SSR/ISR 機能を活用できる。

#### 受け入れ基準

1. THE Vercel_Project SHALL be created with the repository connected
2. WHEN a commit is pushed to the main branch, THE Deployment_System SHALL automatically deploy to production
3. WHEN a commit is pushed to a feature branch, THE Deployment_System SHALL automatically create a preview deployment
4. THE Vercel_Project SHALL be configured with the correct root directory for the frontend application
5. THE Vercel_Project SHALL use the Next.js framework preset

### 要件 2: 環境変数の設定

**ユーザーストーリー:** 開発者として、フロントエンドアプリケーションがバックエンド API に接続できるようにしたい。そうすることで、アプリケーションが正常に動作する。

#### 受け入れ基準

1. THE Environment_Variables SHALL include the Backend API URL for production environment
2. THE Environment_Variables SHALL include the Backend API URL for preview environment
3. THE Environment_Variables SHALL include the Cognito User Pool ID
4. THE Environment_Variables SHALL include the Cognito Client ID
5. THE Environment_Variables SHALL include the AWS Region
6. WHEN Environment_Variables are updated in Vercel, THE Deployment_System SHALL redeploy the application

### 要件 3: CORS 設定の更新

**ユーザーストーリー:** 開発者として、Vercel にデプロイされたフロントエンドが API にアクセスできるようにしたい。そうすることで、クロスオリジンエラーが発生しない。

#### 受け入れ基準

1. THE CORS_Configuration SHALL allow requests from the Vercel production domain
2. THE CORS_Configuration SHALL allow requests from explicit Vercel deployment URLs configured via GitHub environment variables
3. THE CORS_Configuration SHALL include the necessary HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
4. THE CORS_Configuration SHALL include the necessary headers (Content-Type, Authorization)
5. WHEN a preflight request is received, THE Backend_API SHALL respond with appropriate CORS headers

### 要件 4: AWS CDK の更新

**ユーザーストーリー:** 開発者として、フロントエンド関連の AWS リソースを削除したい。そうすることで、Vercel に移行後の不要なリソースを排除できる。

#### 受け入れ基準

1. THE CDK_Stack SHALL remove the S3 bucket for frontend hosting
2. THE CDK_Stack SHALL remove the CloudFront distribution for frontend
3. THE CDK_Stack SHALL remove the S3 deployment resources
4. THE CDK_Stack SHALL retain all backend resources (Lambda, API Gateway, DynamoDB, Cognito)
5. WHEN the CDK stack is deployed, THE Deployment_System SHALL not create frontend infrastructure resources

### 要件 5: GitHub Actions ワークフローの更新

**ユーザーストーリー:** 開発者として、GitHub Actions からフロントエンドのデプロイステップを削除したい。そうすることで、Vercel が自動的にデプロイを処理する。

#### 受け入れ基準

1. THE GitHub_Actions_Workflow SHALL remove the frontend build step
2. THE GitHub_Actions_Workflow SHALL remove the S3 upload step
3. THE GitHub_Actions_Workflow SHALL remove the CloudFront invalidation step
4. THE GitHub_Actions_Workflow SHALL retain the backend deployment steps
5. THE GitHub_Actions_Workflow SHALL retain the CDK deployment steps for backend infrastructure

### 要件 6: Next.js 設定の更新

**ユーザーストーリー:** 開発者として、Next.js の設定を Vercel デプロイに最適化したい。そうすることで、パフォーマンスと機能性が向上する。

#### 受け入れ基準

1. THE Frontend_Application SHALL remove the `output: 'export'` configuration
2. THE Frontend_Application SHALL enable Server-Side Rendering (SSR)
3. THE Frontend_Application SHALL enable Incremental Static Regeneration (ISR) where appropriate
4. THE Frontend_Application SHALL configure image optimization for Vercel
5. WHEN Dynamic_Routes are accessed, THE Frontend_Application SHALL render correctly

### 要件 7: デプロイの検証

**ユーザーストーリー:** 開発者として、Vercel へのデプロイが成功したことを確認したい。そうすることで、アプリケーションが正常に動作していることを保証できる。

#### 受け入れ基準

1. WHEN the application is deployed to Vercel, THE Frontend_Application SHALL be accessible via HTTPS
2. WHEN a user accesses a dynamic route, THE Frontend_Application SHALL render the correct page
3. WHEN a user performs an API call, THE Frontend_Application SHALL successfully communicate with the Backend_API
4. WHEN a user logs in, THE Frontend_Application SHALL successfully authenticate via Cognito
5. THE Frontend_Application SHALL display no console errors related to CORS or API connectivity

### 要件 8: ドキュメントの更新

**ユーザーストーリー:** 開発者として、デプロイ手順のドキュメントを更新したい。そうすることで、チームメンバーが新しいデプロイプロセスを理解できる。

#### 受け入れ基準

1. THE documentation SHALL describe the Vercel deployment process
2. THE documentation SHALL list all required environment variables
3. THE documentation SHALL explain how to create preview deployments
4. THE documentation SHALL describe how to rollback deployments
5. THE documentation SHALL include troubleshooting steps for common issues
