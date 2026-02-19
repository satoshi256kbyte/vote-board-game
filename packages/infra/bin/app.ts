#!/usr/bin/env node
import 'source-map-support/register.js';
import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack.js';

const app = new cdk.App();

// cdk-nag によるセキュリティチェックを有効化
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

new VoteBoardGameStack(app, 'VoteBoardGameStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  },
  description: '投票ボードゲーム - メインスタック',
  tags: {
    Project: 'VoteBoardGame',
    Environment: process.env.ENVIRONMENT || 'dev',
  },
});

app.synth();
