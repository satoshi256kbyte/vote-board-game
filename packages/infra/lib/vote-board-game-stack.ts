import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface VoteBoardGameStackProps extends cdk.StackProps {
  environment?: string;
}

export class VoteBoardGameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: VoteBoardGameStackProps) {
    super(scope, id, props);

    const environment = props?.environment || process.env.ENVIRONMENT || 'development';
    const isProduction = environment === 'production';

    // DynamoDB テーブル (Single Table Design)
    const table = new dynamodb.Table(this, 'VoteBoardGameTable', {
      tableName: `VoteBoardGame-${environment}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI1: ゲーム一覧取得用
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // GSI2: ユーザーの投票履歴取得用
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Cognito ユーザープール
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `vote-board-game-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      customAttributes: {
        username: new cognito.StringAttribute({ minLen: 3, maxLen: 20, mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true, // 特殊文字を必須に
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    // cdk-nag suppressions for Cognito
    NagSuppressions.addResourceSuppressions(
      userPool,
      [
        {
          id: 'AwsSolutions-COG2',
          reason: 'MVP では MFA はオプショナル。ユーザー体験を優先し、将来的に必須化を検討。',
        },
        {
          id: 'AwsSolutions-COG3',
          reason: 'MVP では Advanced Security Mode は不要。将来的にトラフィック増加時に実装。',
        },
      ],
      true
    );

    // Cognito ユーザープールクライアント
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `vote-board-game-client-${environment}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      enableTokenRevocation: true,
    });

    // Lambda 関数 (API)
    const apiLambda = new lambda.Function(this, 'ApiFunction', {
      functionName: `vote-board-game-api-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../api/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        TABLE_NAME: table.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        ALLOWED_ORIGINS:
          environment === 'production'
            ? 'https://vote-board-game.example.com'
            : environment === 'staging'
              ? 'https://stg.vote-board-game.example.com'
              : 'http://localhost:3000',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // cdk-nag suppressions for LogRetention Lambda (auto-created by CDK)
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `/${this.stackName}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource`,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'LogRetention Lambda は CDK が自動生成。AWS マネージドポリシーを使用。',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        },
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `/${this.stackName}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource`,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'LogRetention Lambda は CDK が自動生成。CloudWatch Logs へのアクセスに wildcard が必要。',
          appliesTo: ['Resource::*'],
        },
      ]
    );

    // Lambda に DynamoDB テーブルへのアクセス権限を付与
    table.grantReadWriteData(apiLambda);

    // Lambda に Cognito へのアクセス権限を付与
    userPool.grant(apiLambda, 'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes');

    // API Gateway HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `vote-board-game-api-${environment}`,
      description: `Vote Board Game API - ${environment}`,
      corsPreflight: {
        allowOrigins:
          environment === 'production'
            ? ['https://vote-board-game.example.com']
            : environment === 'staging'
              ? ['https://stg.vote-board-game.example.com']
              : ['http://localhost:3000'],
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

    // Lambda 統合
    const lambdaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'ApiLambdaIntegration',
      apiLambda,
      {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0,
      }
    );

    // JWT Authorizer (Cognito) - 将来の認証が必要なエンドポイント用
    // const jwtAuthorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer(
    //   'JwtAuthorizer',
    //   userPool.userPoolProviderUrl,
    //   {
    //     jwtAudience: [userPoolClient.userPoolClientId],
    //     identitySource: ['$request.header.Authorization'],
    //   }
    // );

    // デフォルトルート (すべてのリクエストを Lambda に転送)
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: lambdaIntegration,
    });

    // ヘルスチェックルート (認証不要)
    httpApi.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // cdk-nag suppressions for Lambda
    NagSuppressions.addResourceSuppressions(
      apiLambda,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Node.js 20.x は現時点で最新の LTS バージョン。',
        },
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Lambda 実行ロールは AWS マネージドポリシー AWSLambdaBasicExecutionRole を使用。',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'DynamoDB テーブルへのアクセスには wildcard が必要。GSI へのアクセスを含む。',
        },
      ],
      true
    );

    // cdk-nag suppressions for API Gateway
    NagSuppressions.addResourceSuppressions(
      httpApi,
      [
        {
          id: 'AwsSolutions-APIG1',
          reason: 'MVP ではアクセスログは不要。将来的にトラフィック増加時に実装。',
        },
        {
          id: 'AwsSolutions-APIG4',
          reason:
            'MVP では認証なしのパブリック API として実装。将来的に Cognito JWT Authorizer を実装予定。',
        },
      ],
      true
    );

    // S3 バケット (アクセスログ用)
    const logBucket = new s3.Bucket(this, 'LogBucket', {
      bucketName: `vote-board-game-logs-${environment}-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
    });

    // S3 バケット (フロントエンド用)
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `vote-board-game-web-${environment}-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      serverAccessLogsBucket: logBucket,
      serverAccessLogsPrefix: 'web-bucket-logs/',
      enforceSSL: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/404.html',
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      logBucket: logBucket,
      logFilePrefix: 'cloudfront-logs/',
    });

    // cdk-nag suppressions for MVP
    NagSuppressions.addResourceSuppressions(
      distribution,
      [
        {
          id: 'AwsSolutions-CFR1',
          reason: 'MVP では Geo restriction は不要。将来的に必要に応じて実装。',
        },
        {
          id: 'AwsSolutions-CFR2',
          reason: 'MVP では WAF は不要。将来的にトラフィック増加時に実装。',
        },
        {
          id: 'AwsSolutions-CFR4',
          reason: 'デフォルト CloudFront 証明書を使用。カスタムドメイン実装時に ACM 証明書で対応。',
        },
      ],
      true
    );

    // Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB テーブル名',
      exportName: `VoteBoardGameTableName-${environment}`,
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: table.tableArn,
      description: 'DynamoDB テーブル ARN',
      exportName: `VoteBoardGameTableArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'WebBucketName', {
      value: webBucket.bucketName,
      description: 'フロントエンド用 S3 バケット名',
      exportName: `VoteBoardGameWebBucketName-${environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront ディストリビューション ID',
      exportName: `VoteBoardGameDistributionId-${environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront ドメイン名',
      exportName: `VoteBoardGameDistributionDomain-${environment}`,
    });

    new cdk.CfnOutput(this, 'Environment', {
      value: environment,
      description: 'デプロイ環境',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito ユーザープール ID',
      exportName: `VoteBoardGameUserPoolId-${environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: userPool.userPoolArn,
      description: 'Cognito ユーザープール ARN',
      exportName: `VoteBoardGameUserPoolArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito ユーザープールクライアント ID',
      exportName: `VoteBoardGameUserPoolClientId-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway エンドポイント URL',
      exportName: `VoteBoardGameApiUrl-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: httpApi.apiId,
      description: 'API Gateway ID',
      exportName: `VoteBoardGameApiId-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiLambdaFunctionName', {
      value: apiLambda.functionName,
      description: 'API Lambda 関数名',
      exportName: `VoteBoardGameApiLambdaName-${environment}`,
    });

    new cdk.CfnOutput(this, 'ApiLambdaFunctionArn', {
      value: apiLambda.functionArn,
      description: 'API Lambda 関数 ARN',
      exportName: `VoteBoardGameApiLambdaArn-${environment}`,
    });
  }
}
