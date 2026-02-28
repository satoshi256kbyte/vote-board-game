import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack.js';

describe('VoteBoardGameStack', () => {
  describe('Development environment', () => {
    it('should create DynamoDB table with development configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // DynamoDB テーブルが作成されていることを確認
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'vbg-dev-dynamodb-main',
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true, // セキュリティのため全環境で有効化
        },
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    it('should create DynamoDB table with TTL configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // TTL設定が有効化されていることを確認
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true,
        },
      });
    });

    it('should create S3 bucket and CloudFront distribution', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // S3 バケットが作成されていることを確認（log + icon の2つ、web は削除済み）
      template.resourceCountIs('AWS::S3::Bucket', 2);

      // CloudFront Distribution が作成されていることを確認（icon の1つ、web は削除済み）
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    it('should create CloudFormation outputs', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasOutput('TableName', {
        Export: {
          Name: 'VoteBoardGameTableName-dev',
        },
      });

      // WebBucketName と DistributionId は削除済み（Vercel 移行のため）

      template.hasOutput('Environment', {
        Value: 'dev',
      });
    });
  });

  describe('Production environment', () => {
    it('should create DynamoDB table with production configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'prod',
      });
      const template = Template.fromStack(stack);

      // DynamoDB テーブルが作成されていることを確認
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'vbg-prod-dynamodb-main',
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true, // production は true
        },
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });
  });

  describe('GSI configuration', () => {
    it('should create GSI1 and GSI2', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              {
                AttributeName: 'GSI1PK',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'GSI1SK',
                KeyType: 'RANGE',
              },
            ],
          },
          {
            IndexName: 'GSI2',
            KeySchema: [
              {
                AttributeName: 'GSI2PK',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'GSI2SK',
                KeyType: 'RANGE',
              },
            ],
          },
        ],
      });
    });
  });

  describe('Resource counts', () => {
    it('should have exactly 1 DynamoDB table', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });

    it('should have exactly 2 S3 buckets', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::S3::Bucket', 2); // log + icon (web は削除済み)
    });

    it('should have exactly 1 CloudFront distribution', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::CloudFront::Distribution', 1); // icon のみ (web は削除済み)
    });

    it('should have exactly 1 Cognito User Pool', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });

    it('should have exactly 1 Cognito User Pool Client', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    it('should have exactly 2 Lambda functions', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // API Lambda + Batch Lambda + S3AutoDelete Lambda (icon bucket 用) が作成される
      template.resourceCountIs('AWS::Lambda::Function', 3);
    });

    it('should have exactly 1 API Gateway HTTP API', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    });
  });

  describe('Cognito configuration', () => {
    it('should create User Pool with correct configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'vbg-dev-cognito-main',
        AutoVerifiedAttributes: ['email'],
        MfaConfiguration: 'OPTIONAL',
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireUppercase: true,
            RequireSymbols: false, // 要件3.1-3.4: 特殊文字は不要
          },
        },
      });
    });

    it('should create User Pool Client with correct configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'vbg-dev-cognito-client',
        GenerateSecret: false,
        PreventUserExistenceErrors: 'ENABLED',
        ExplicitAuthFlows: Match.arrayWith([
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ]),
        AccessTokenValidity: 60,
        IdTokenValidity: 60,
        RefreshTokenValidity: 43200, // 30 days in minutes
        TokenValidityUnits: {
          AccessToken: 'minutes',
          IdToken: 'minutes',
          RefreshToken: 'minutes',
        },
        EnableTokenRevocation: true,
      });
    });

    it('should create Cognito outputs', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasOutput('UserPoolId', {
        Export: {
          Name: 'VoteBoardGameUserPoolId-dev',
        },
      });

      template.hasOutput('UserPoolArn', {
        Export: {
          Name: 'VoteBoardGameUserPoolArn-dev',
        },
      });

      template.hasOutput('UserPoolClientId', {
        Export: {
          Name: 'VoteBoardGameUserPoolClientId-dev',
        },
      });
    });
  });

  describe('Snapshot tests', () => {
    it('should match CloudFormation template snapshot for dev environment', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // スナップショットテスト: CloudFormation テンプレート全体を検証
      expect(template.toJSON()).toMatchSnapshot();
    });

    it('should match CloudFormation template snapshot for prod environment', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'prod',
      });
      const template = Template.fromStack(stack);

      // スナップショットテスト: CloudFormation テンプレート全体を検証
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('Lambda and API Gateway configuration', () => {
    it('should create Lambda function with correct configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'vbg-dev-lambda-api',
        Runtime: 'nodejs20.x',
        Handler: 'lambda.handler',
        Timeout: 30,
        MemorySize: 512,
        TracingConfig: {
          Mode: 'Active',
        },
      });
    });

    it('should set Lambda environment variables for dev environment', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'vbg-dev-lambda-api',
        Environment: {
          Variables: {
            NODE_ENV: 'dev',
            TABLE_NAME: Match.objectLike({
              Ref: Match.stringLikeRegexp('VoteBoardGameTable.*'),
            }),
            COGNITO_USER_POOL_ID: Match.objectLike({
              Ref: Match.stringLikeRegexp('UserPool.*'),
            }),
            COGNITO_CLIENT_ID: Match.objectLike({
              Ref: Match.stringLikeRegexp('UserPoolClient.*'),
            }),
            ALLOWED_ORIGINS: 'http://localhost:3000',
          },
        },
      });
    });

    it('should set Lambda environment variables for stg environment', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'stg',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'vbg-stg-lambda-api',
        Environment: {
          Variables: {
            NODE_ENV: 'stg',
            TABLE_NAME: Match.objectLike({
              Ref: Match.stringLikeRegexp('VoteBoardGameTable.*'),
            }),
            COGNITO_USER_POOL_ID: Match.objectLike({
              Ref: Match.stringLikeRegexp('UserPool.*'),
            }),
            COGNITO_CLIENT_ID: Match.objectLike({
              Ref: Match.stringLikeRegexp('UserPoolClient.*'),
            }),
            ALLOWED_ORIGINS: '',
          },
        },
      });
    });

    it('should set Lambda environment variables for prod environment', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'prod',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'vbg-prod-lambda-api',
        Environment: {
          Variables: {
            NODE_ENV: 'prod',
            TABLE_NAME: Match.objectLike({
              Ref: Match.stringLikeRegexp('VoteBoardGameTable.*'),
            }),
            COGNITO_USER_POOL_ID: Match.objectLike({
              Ref: Match.stringLikeRegexp('UserPool.*'),
            }),
            COGNITO_CLIENT_ID: Match.objectLike({
              Ref: Match.stringLikeRegexp('UserPoolClient.*'),
            }),
            ALLOWED_ORIGINS: '',
          },
        },
      });
    });

    it('should create API Gateway HTTP API with CORS', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
        Name: 'vbg-dev-apigateway-main',
        ProtocolType: 'HTTP',
        CorsConfiguration: {
          AllowOrigins: ['http://localhost:3000'],
          AllowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          AllowHeaders: ['Content-Type', 'Authorization'],
          AllowCredentials: true,
          MaxAge: 3600,
        },
      });
    });

    it('should grant Lambda Cognito permissions including AdminDeleteUser', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // Lambda の IAM ロールに Cognito 権限が付与されていることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminDeleteUser',
              ]),
              Effect: 'Allow',
              Resource: Match.objectLike({
                'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('UserPool.*')]),
              }),
            }),
          ]),
        },
      });
    });

    it('should create API outputs', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.hasOutput('ApiUrl', {
        Export: {
          Name: 'VoteBoardGameApiUrl-dev',
        },
      });

      template.hasOutput('ApiId', {
        Export: {
          Name: 'VoteBoardGameApiId-dev',
        },
      });

      template.hasOutput('ApiLambdaFunctionName', {
        Export: {
          Name: 'VoteBoardGameApiLambdaName-dev',
        },
      });
    });
  });
});
