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
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface VoteBoardGameStackProps extends cdk.StackProps {
  appName: string;
  environment: string;
}

export class VoteBoardGameStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VoteBoardGameStackProps) {
    super(scope, id, props);

    const { appName, environment } = props;
    const isProduction = environment === 'prod';

    // S3 バケット (アクセスログ用) - 最初に作成
    const logBucket = new s3.Bucket(this, 'LogBucket', {
      bucketName: `${appName}-${environment}-s3-logs-${this.account}`,
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
      bucketName: `${appName}-${environment}-s3-web-${this.account}`,
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

    // cdk-nag suppressions for CloudFront
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

    // CloudFront のドメイン名を CORS 用に準備
    const frontendOrigin = `https://${distribution.distributionDomainName}`;

    // DynamoDB テーブル (Single Table Design)
    const table = new dynamodb.Table(this, 'VoteBoardGameTable', {
      tableName: `${appName}-${environment}-dynamodb-main`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expiresAt', // レート制限レコードの自動削除用
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
      userPoolName: `${appName}-${environment}-cognito-main`,
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
        requireSymbols: false, // 要件3.1-3.4: 特殊文字は不要
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
          id: 'AwsSolutions-COG1',
          reason:
            '要件3.1-3.4: パスワードポリシーは8文字以上、大文字・小文字・数字を必須とするが、特殊文字は不要。ユーザー体験を優先。',
        },
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
      userPoolClientName: `${appName}-${environment}-cognito-client`,
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
    // パスは実行環境によって異なる:
    // - テスト時 (vitest): packages/infra/lib から ../../api/dist
    // - 本番時 (cdk synth): packages/infra/dist/lib から ../../../api/dist
    const apiCodePath =
      process.env.NODE_ENV === 'test' || process.env.VITEST
        ? path.join(__dirname, '../../api/dist')
        : path.join(__dirname, '../../../api/dist');

    // API Lambda用のIAMロールを作成
    const apiLambdaRole = new cdk.aws_iam.Role(this, 'ApiLambdaRole', {
      roleName: `${appName}-${environment}-iam-lambda-api-role`,
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    // cdk-nag suppression for ApiLambdaRole using AWS managed policy
    NagSuppressions.addResourceSuppressions(
      apiLambdaRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'AWSLambdaBasicExecutionRole is AWS managed policy for Lambda logging',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        },
      ],
      true
    );

    // ALLOWED_ORIGINS を環境ごとに設定
    const allowedOrigins = (() => {
      switch (environment) {
        case 'dev':
          return 'http://localhost:3000';
        case 'stg':
          return 'https://stg.vote-board-game.example.com';
        case 'prod':
          return 'https://vote-board-game.example.com';
        default:
          return frontendOrigin;
      }
    })();

    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/lambda/${appName}-${environment}-lambda-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const apiLambda = new lambda.Function(this, 'ApiFunction', {
      functionName: `${appName}-${environment}-lambda-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(apiCodePath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: apiLambdaRole,
      environment: {
        NODE_ENV: environment,
        TABLE_NAME: table.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        ALLOWED_ORIGINS: allowedOrigins,
      },
      logGroup: apiLogGroup,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Lambda に DynamoDB テーブルへのアクセス権限を付与
    table.grantReadWriteData(apiLambda);

    // Lambda に Cognito へのアクセス権限を付与
    userPool.grant(
      apiLambda,
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminDeleteUser'
    );

    // cdk-nag suppression for ApiLambdaRole/DefaultPolicy wildcard permissions
    NagSuppressions.addResourceSuppressions(
      apiLambdaRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'DynamoDB GSI access requires wildcard for index ARNs, Cognito operations require wildcard for user operations',
          appliesTo: [
            'Action::cognito-idp:*',
            {
              regex: '/^Resource::<VoteBoardGameTable.*\\.Arn>/index/\\*$/g',
            },
            'Resource::*',
          ],
        },
      ],
      true
    );

    // API Gateway HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${appName}-${environment}-apigateway-main`,
      description: `Vote Board Game API - ${environment}`,
      corsPreflight: {
        allowOrigins: [frontendOrigin],
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

    // Batch Lambda 用の IAM ロール
    const batchLambdaRole = new iam.Role(this, 'BatchLambdaRole', {
      roleName: `${appName}-${environment}-iam-lambda-batch-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // cdk-nag suppression for BatchLambdaRole
    NagSuppressions.addResourceSuppressions(
      batchLambdaRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'AWSLambdaBasicExecutionRole is AWS managed policy for Lambda logging',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        },
      ],
      true
    );

    // Batch Lambda 関数
    const batchLogGroup = new logs.LogGroup(this, 'BatchLogGroup', {
      logGroupName: `/aws/lambda/${appName}-${environment}-lambda-batch`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const batchLambda = new lambda.Function(this, 'BatchFunction', {
      functionName: `${appName}-${environment}-lambda-batch`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'batch.handler',
      code: lambda.Code.fromAsset(apiCodePath),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      role: batchLambdaRole,
      environment: {
        NODE_ENV: environment,
        TABLE_NAME: table.tableName,
      },
      logGroup: batchLogGroup,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Batch Lambda に DynamoDB テーブルへのアクセス権限を付与
    table.grantReadWriteData(batchLambda);

    // cdk-nag suppression for BatchLambdaRole/DefaultPolicy
    NagSuppressions.addResourceSuppressions(
      batchLambdaRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'DynamoDB GSI access requires wildcard for index ARNs, X-Ray tracing requires Resource::*',
          appliesTo: [
            {
              regex: '/^Resource::<VoteBoardGameTable.*\\.Arn>/index/\\*$/g',
            },
            'Resource::*',
          ],
        },
      ],
      true
    );

    // cdk-nag suppression for Batch Lambda
    NagSuppressions.addResourceSuppressions(
      batchLambda,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Node.js 20.x は現時点で最新の LTS バージョン。',
        },
      ],
      true
    );

    // EventBridge Scheduler 用の IAM ロール
    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      roleName: `${appName}-${environment}-iam-scheduler-role`,
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });

    // Scheduler に Lambda 実行権限を付与
    batchLambda.grantInvoke(schedulerRole);

    // cdk-nag suppression for SchedulerRole/DefaultPolicy
    NagSuppressions.addResourceSuppressions(
      schedulerRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Lambda invoke permission requires wildcard for function versions and aliases',
          appliesTo: [
            {
              regex: '/^Resource::<BatchFunction.*\\.Arn>:\\*$/g',
            },
          ],
        },
      ],
      true
    );

    // EventBridge Scheduler (JST 0:00 = UTC 15:00)
    const schedule = new scheduler.CfnSchedule(this, 'DailyBatchSchedule', {
      name: `${appName}-${environment}-schedule-daily-batch`,
      description: '日次バッチ処理（投票集計・次の一手決定・AI候補生成）',
      scheduleExpression: 'cron(0 15 * * ? *)', // UTC 15:00 = JST 0:00
      scheduleExpressionTimezone: 'UTC',
      flexibleTimeWindow: {
        mode: 'OFF',
      },
      target: {
        arn: batchLambda.functionArn,
        roleArn: schedulerRole.roleArn,
      },
    });

    // CloudWatch Alarms and Monitoring (Production only)
    if (isProduction) {
      // SNS Topics for alerts
      const criticalAlertTopic = new sns.Topic(this, 'CriticalAlertTopic', {
        topicName: `${appName}-${environment}-critical-alerts`,
        displayName: 'Vote Board Game Critical Alerts',
      });

      const warningAlertTopic = new sns.Topic(this, 'WarningAlertTopic', {
        topicName: `${appName}-${environment}-warning-alerts`,
        displayName: 'Vote Board Game Warning Alerts',
      });

      // Email subscriptions (replace with actual email addresses in production)
      // Example:
      // import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
      // criticalAlertTopic.addSubscription(new snsSubscriptions.EmailSubscription('[email]'));
      // warningAlertTopic.addSubscription(new snsSubscriptions.EmailSubscription('[email]'));

      // 1. API Lambda Alarms
      // Critical: API Lambda エラー率上昇
      const apiLambdaErrorRateAlarm = new cloudwatch.Alarm(this, 'ApiLambdaErrorRateAlarm', {
        alarmName: `${appName}-${environment}-api-lambda-error-rate`,
        alarmDescription: 'API Lambda のエラー率が 5% を超えています',
        metric: new cloudwatch.MathExpression({
          expression: '(errors / invocations) * 100',
          usingMetrics: {
            errors: apiLambda.metricErrors({
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
            invocations: apiLambda.metricInvocations({
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
          },
        }),
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      apiLambdaErrorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(criticalAlertTopic));

      // Warning: API Lambda 実行時間超過
      const apiLambdaDurationAlarm = new cloudwatch.Alarm(this, 'ApiLambdaDurationAlarm', {
        alarmName: `${appName}-${environment}-api-lambda-duration`,
        alarmDescription: 'API Lambda の実行時間（p99）が 25秒 を超えています',
        metric: apiLambda.metricDuration({
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 25000, // 25 seconds in milliseconds
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      apiLambdaDurationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // Warning: API Lambda スロットリング発生
      const apiLambdaThrottlesAlarm = new cloudwatch.Alarm(this, 'ApiLambdaThrottlesAlarm', {
        alarmName: `${appName}-${environment}-api-lambda-throttles`,
        alarmDescription: 'API Lambda でスロットリングが発生しています',
        metric: apiLambda.metricThrottles({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      apiLambdaThrottlesAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // 2. Batch Lambda Alarms
      // Critical: Batch Lambda 実行失敗
      const batchLambdaErrorAlarm = new cloudwatch.Alarm(this, 'BatchLambdaErrorAlarm', {
        alarmName: `${appName}-${environment}-batch-lambda-error`,
        alarmDescription: 'Batch Lambda の実行が失敗しました',
        metric: batchLambda.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      batchLambdaErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(criticalAlertTopic));

      // Warning: Batch Lambda 実行時間超過
      const batchLambdaDurationAlarm = new cloudwatch.Alarm(this, 'BatchLambdaDurationAlarm', {
        alarmName: `${appName}-${environment}-batch-lambda-duration`,
        alarmDescription: 'Batch Lambda の実行時間が 4分 を超えています',
        metric: batchLambda.metricDuration({
          statistic: 'Maximum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 240000, // 4 minutes in milliseconds
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      batchLambdaDurationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // 3. API Gateway Alarms
      // Critical: API Gateway 5XX エラー多発
      const apiGateway5xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
        alarmName: `${appName}-${environment}-apigateway-5xx`,
        alarmDescription: 'API Gateway で 5XX エラーが多発しています',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiId: httpApi.apiId,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      apiGateway5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(criticalAlertTopic));

      // Warning: API Gateway 4XX エラー多発
      const apiGateway4xxAlarm = new cloudwatch.Alarm(this, 'ApiGateway4xxAlarm', {
        alarmName: `${appName}-${environment}-apigateway-4xx`,
        alarmDescription: 'API Gateway で 4XX エラーが多発しています',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiId: httpApi.apiId,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 100,
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      apiGateway4xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // Warning: API Gateway レイテンシ上昇
      const apiGatewayLatencyAlarm = new cloudwatch.Alarm(this, 'ApiGatewayLatencyAlarm', {
        alarmName: `${appName}-${environment}-apigateway-latency`,
        alarmDescription: 'API Gateway のレイテンシ（p99）が 3秒 を超えています',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiId: httpApi.apiId,
          },
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 3000, // 3 seconds in milliseconds
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      apiGatewayLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // 4. DynamoDB Alarms
      // Critical: DynamoDB システムエラー発生
      const dynamodbSystemErrorAlarm = new cloudwatch.Alarm(this, 'DynamoDBSystemErrorAlarm', {
        alarmName: `${appName}-${environment}-dynamodb-system-error`,
        alarmDescription: 'DynamoDB でシステムエラーが発生しています',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'SystemErrors',
          dimensionsMap: {
            TableName: table.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      dynamodbSystemErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(criticalAlertTopic));

      // Warning: DynamoDB ユーザーエラー多発
      const dynamodbUserErrorAlarm = new cloudwatch.Alarm(this, 'DynamoDBUserErrorAlarm', {
        alarmName: `${appName}-${environment}-dynamodb-user-error`,
        alarmDescription: 'DynamoDB でユーザーエラーが多発しています',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'UserErrors',
          dimensionsMap: {
            TableName: table.tableName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      dynamodbUserErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // Warning: DynamoDB レイテンシ上昇
      const dynamodbLatencyAlarm = new cloudwatch.Alarm(this, 'DynamoDBLatencyAlarm', {
        alarmName: `${appName}-${environment}-dynamodb-latency`,
        alarmDescription: 'DynamoDB のレイテンシ（p99）が 100ms を超えています',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'SuccessfulRequestLatency',
          dimensionsMap: {
            TableName: table.tableName,
            Operation: 'GetItem',
          },
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 100, // 100 milliseconds
        evaluationPeriods: 3,
        datapointsToAlarm: 3,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      dynamodbLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(warningAlertTopic));

      // 5. EventBridge Scheduler Alarm
      // Critical: EventBridge Scheduler 実行失敗
      const schedulerErrorAlarm = new cloudwatch.Alarm(this, 'SchedulerErrorAlarm', {
        alarmName: `${appName}-${environment}-scheduler-error`,
        alarmDescription: 'EventBridge Scheduler の実行が失敗しました',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Scheduler',
          metricName: 'TargetErrorCount',
          dimensionsMap: {
            ScheduleName: schedule.name!,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      schedulerErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(criticalAlertTopic));

      // Outputs for SNS Topics
      new cdk.CfnOutput(this, 'CriticalAlertTopicArn', {
        value: criticalAlertTopic.topicArn,
        description: 'Critical Alert SNS Topic ARN',
        exportName: `VoteBoardGameCriticalAlertTopicArn-${environment}`,
      });

      new cdk.CfnOutput(this, 'WarningAlertTopicArn', {
        value: warningAlertTopic.topicArn,
        description: 'Warning Alert SNS Topic ARN',
        exportName: `VoteBoardGameWarningAlertTopicArn-${environment}`,
      });
    }

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

    new cdk.CfnOutput(this, 'BatchLambdaFunctionName', {
      value: batchLambda.functionName,
      description: 'Batch Lambda 関数名',
      exportName: `VoteBoardGameBatchLambdaName-${environment}`,
    });

    new cdk.CfnOutput(this, 'BatchLambdaFunctionArn', {
      value: batchLambda.functionArn,
      description: 'Batch Lambda 関数 ARN',
      exportName: `VoteBoardGameBatchLambdaArn-${environment}`,
    });

    new cdk.CfnOutput(this, 'ScheduleName', {
      value: schedule.name!,
      description: 'EventBridge Scheduler 名',
      exportName: `VoteBoardGameScheduleName-${environment}`,
    });
  }
}
