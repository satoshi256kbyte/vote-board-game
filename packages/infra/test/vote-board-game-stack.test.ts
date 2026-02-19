import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack.js';

describe('VoteBoardGameStack', () => {
  it('should create DynamoDB table with correct configuration', () => {
    const app = new cdk.App();
    const stack = new VoteBoardGameStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    // DynamoDB テーブルが作成されていることを確認
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'VoteBoardGame',
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      SSESpecification: {
        SSEEnabled: true,
      },
    });
  });

  it('should create GSI1 for game list queries', () => {
    const app = new cdk.App();
    const stack = new VoteBoardGameStack(app, 'TestStack');
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

  it('should have exactly 1 DynamoDB table', () => {
    const app = new cdk.App();
    const stack = new VoteBoardGameStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::DynamoDB::Table', 1);
  });

  it('should create CloudFormation outputs', () => {
    const app = new cdk.App();
    const stack = new VoteBoardGameStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    template.hasOutput('TableName', {
      Export: {
        Name: 'VoteBoardGameTableName',
      },
    });

    template.hasOutput('TableArn', {
      Export: {
        Name: 'VoteBoardGameTableArn',
      },
    });
  });

  it('should match snapshot', () => {
    const app = new cdk.App();
    const stack = new VoteBoardGameStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    expect(template.toJSON()).toMatchSnapshot();
  });
});
