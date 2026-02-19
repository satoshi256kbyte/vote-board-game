import { describe, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack.js';

describe('VoteBoardGameStack', () => {
  describe('Development environment', () => {
    it('should create DynamoDB table with development configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        environment: 'development',
      });
      const template = Template.fromStack(stack);

      // DynamoDB テーブルが作成されていることを確認
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'VoteBoardGame-development',
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false, // development は false
        },
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    it('should create S3 bucket and CloudFront distribution', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        environment: 'development',
      });
      const template = Template.fromStack(stack);

      // S3 バケットが作成されていることを確認
      template.resourceCountIs('AWS::S3::Bucket', 1);

      // CloudFront Distribution が作成されていることを確認
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    it('should create CloudFormation outputs', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        environment: 'development',
      });
      const template = Template.fromStack(stack);

      template.hasOutput('TableName', {
        Export: {
          Name: 'VoteBoardGameTableName-development',
        },
      });

      template.hasOutput('WebBucketName', {
        Export: {
          Name: 'VoteBoardGameWebBucketName-development',
        },
      });

      template.hasOutput('DistributionId', {
        Export: {
          Name: 'VoteBoardGameDistributionId-development',
        },
      });

      template.hasOutput('Environment', {
        Value: 'development',
      });
    });
  });

  describe('Production environment', () => {
    it('should create DynamoDB table with production configuration', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        environment: 'production',
      });
      const template = Template.fromStack(stack);

      // DynamoDB テーブルが作成されていることを確認
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'VoteBoardGame-production',
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
        environment: 'development',
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
        environment: 'development',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::DynamoDB::Table', 1);
    });

    it('should have exactly 1 S3 bucket', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        environment: 'development',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    it('should have exactly 1 CloudFront distribution', () => {
      const app = new cdk.App();
      const stack = new VoteBoardGameStack(app, 'TestStack', {
        environment: 'development',
      });
      const template = Template.fromStack(stack);

      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });
  });
});
