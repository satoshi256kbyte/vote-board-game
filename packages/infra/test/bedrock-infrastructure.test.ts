import { describe, it, expect, beforeAll } from 'vitest';
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack';

describe('Bedrock Infrastructure', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new VoteBoardGameStack(app, 'TestStack', {
      appName: 'vbg',
      environment: 'dev',
    });
    template = Template.fromStack(stack);
  });

  describe('IAM Permissions', () => {
    it('should grant bedrock:InvokeModel permission to Batch Lambda', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchLambdaPolicy = Object.values(policies).find((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        return statements.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (stmt: any) =>
            Array.isArray(stmt.Action) &&
            stmt.Action.includes('bedrock:InvokeModel') &&
            stmt.Effect === 'Allow' &&
            stmt.Resource ===
              'arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-pro-v1:0'
        );
      });

      expect(batchLambdaPolicy).toBeDefined();
    });

    it('should grant bedrock:InvokeModelWithResponseStream permission to Batch Lambda', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchLambdaPolicy = Object.values(policies).find((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        return statements.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (stmt: any) =>
            Array.isArray(stmt.Action) &&
            stmt.Action.includes('bedrock:InvokeModelWithResponseStream') &&
            stmt.Effect === 'Allow' &&
            stmt.Resource ===
              'arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-pro-v1:0'
        );
      });

      expect(batchLambdaPolicy).toBeDefined();
    });

    it('should restrict Bedrock permissions to Nova Pro model only', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchLambdaPolicy = Object.values(policies).find((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        return statements.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (stmt: any) =>
            Array.isArray(stmt.Action) &&
            (stmt.Action.includes('bedrock:InvokeModel') ||
              stmt.Action.includes('bedrock:InvokeModelWithResponseStream'))
        );
      });

      expect(batchLambdaPolicy).toBeDefined();

      // Verify the resource is restricted to Nova Pro model
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statements = (batchLambdaPolicy as any).Properties.PolicyDocument.Statement;
      const bedrockStatement = statements.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stmt: any) =>
          Array.isArray(stmt.Action) &&
          (stmt.Action.includes('bedrock:InvokeModel') ||
            stmt.Action.includes('bedrock:InvokeModelWithResponseStream'))
      );

      expect(bedrockStatement.Resource).toBe(
        'arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-pro-v1:0'
      );
    });
  });

  describe('Environment Variables', () => {
    it('should set BEDROCK_MODEL_ID environment variable', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.Environment.Variables.BEDROCK_MODEL_ID).toBe(
        'amazon.nova-pro-v1:0'
      );
    });

    it('should set BEDROCK_REGION environment variable', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.Environment.Variables.BEDROCK_REGION).toBe('ap-northeast-1');
    });

    it('should set BEDROCK_MAX_TOKENS environment variable', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.Environment.Variables.BEDROCK_MAX_TOKENS).toBe('2048');
    });

    it('should set BEDROCK_TEMPERATURE environment variable', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.Environment.Variables.BEDROCK_TEMPERATURE).toBe('0.7');
    });

    it('should set BEDROCK_TOP_P environment variable', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.Environment.Variables.BEDROCK_TOP_P).toBe('0.9');
    });
  });

  describe('Lambda Configuration', () => {
    it('should configure Batch Lambda timeout to 30 seconds', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.Timeout).toBe(30);
    });

    it('should configure Batch Lambda memory to 512 MB', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.MemorySize).toBe(512);
    });

    it('should enable X-Ray tracing for Batch Lambda', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      expect(batchFunction.Properties.TracingConfig.Mode).toBe('Active');
    });
  });

  describe('CloudWatch Logs', () => {
    it('should set CloudWatch Logs retention to 30 days', () => {
      const logGroups = template.findResources('AWS::Logs::LogGroup', {
        Properties: {
          LogGroupName: '/aws/lambda/vbg-dev-lambda-batch',
        },
      });

      const batchLogGroup = Object.values(logGroups)[0] as {
        Properties: { RetentionInDays: number };
      };
      expect(batchLogGroup.Properties.RetentionInDays).toBe(30);
    });

    it('should create log group for Batch Lambda', () => {
      template.resourceCountIs('AWS::Logs::LogGroup', 2); // API Lambda + Batch Lambda
    });
  });

  describe('Resource Count', () => {
    it('should create exactly one Batch Lambda function', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });
      expect(Object.keys(functions).length).toBe(1);
    });

    it('should create IAM role for Batch Lambda', () => {
      const roles = template.findResources('AWS::IAM::Role', {
        Properties: {
          RoleName: 'vbg-dev-iam-lambda-batch-role',
        },
      });

      expect(Object.keys(roles).length).toBe(1);

      const role = Object.values(roles)[0] as {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: Array<{ Action: string; Principal: { Service: string } }>;
          };
        };
      };
      expect(role.Properties.AssumeRolePolicyDocument.Statement[0].Action).toBe('sts:AssumeRole');
      expect(role.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service).toBe(
        'lambda.amazonaws.com'
      );
    });
  });

  describe('Integration', () => {
    it('should attach Bedrock policy to Batch Lambda role', () => {
      // Find the Batch Lambda role
      const roles = template.findResources('AWS::IAM::Role', {
        Properties: {
          RoleName: 'vbg-dev-iam-lambda-batch-role',
        },
      });

      expect(Object.keys(roles).length).toBe(1);

      // Verify that a policy is attached to this role
      const policies = template.findResources('AWS::IAM::Policy');
      const batchLambdaPolicies = Object.values(policies).filter(
        (policy: {
          Properties?: {
            PolicyDocument?: {
              Statement?: Array<{ Action?: string[] | string }>;
            };
          };
        }) => {
          const statements = policy.Properties?.PolicyDocument?.Statement || [];
          return statements.some(
            (stmt: { Action?: string[] | string }) =>
              (Array.isArray(stmt.Action) && stmt.Action.includes('bedrock:InvokeModel')) ||
              (Array.isArray(stmt.Action) &&
                stmt.Action.includes('bedrock:InvokeModelWithResponseStream')) ||
              stmt.Action === 'bedrock:InvokeModel' ||
              stmt.Action === 'bedrock:InvokeModelWithResponseStream'
          );
        }
      );

      expect(batchLambdaPolicies.length).toBeGreaterThan(0);
    });

    it('should have all required environment variables for Bedrock integration', () => {
      const functions = template.findResources('AWS::Lambda::Function', {
        Properties: {
          FunctionName: 'vbg-dev-lambda-batch',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchFunction = Object.values(functions)[0] as any;
      const envVars = batchFunction.Properties.Environment.Variables;

      expect(envVars.BEDROCK_MODEL_ID).toBe('amazon.nova-pro-v1:0');
      expect(envVars.BEDROCK_REGION).toBe('ap-northeast-1');
      expect(envVars.BEDROCK_MAX_TOKENS).toBe('2048');
      expect(envVars.BEDROCK_TEMPERATURE).toBe('0.7');
      expect(envVars.BEDROCK_TOP_P).toBe('0.9');
      expect(envVars.TABLE_NAME).toBeDefined();
      expect(envVars.NODE_ENV).toBe('dev');
    });
  });
});
