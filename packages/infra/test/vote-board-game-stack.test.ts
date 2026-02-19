import { describe, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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

    it('should create S3 bucket and CloudFront distribution', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // S3 バケットが作成されていることを確認（web + log の2つ）
      template.resourceCountIs('AWS::S3::Bucket', 2);

      // CloudFront Distribution が作成されていることを確認
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

      template.hasOutput('WebBucketName', {
        Export: {
          Name: 'VoteBoardGameWebBucketName-dev',
        },
      });

      template.hasOutput('DistributionId', {
        Export: {
          Name: 'VoteBoardGameDistributionId-dev',
        },
      });

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

      template.resourceCountIs('AWS::S3::Bucket', 2); // web + log
    });

    it('should have exactly 1 CloudFront distribution', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
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

    it('should have exactly 1 Lambda function', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        appName: 'vbg',
        environment: 'dev',
      });
      const template = Template.fromStack(stack);

      // API Lambda + ログ保持用の Lambda が作成される
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
            RequireSymbols: true,
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
