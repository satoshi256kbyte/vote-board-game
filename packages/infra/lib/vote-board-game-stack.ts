import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

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
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
    });

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
  }
}
