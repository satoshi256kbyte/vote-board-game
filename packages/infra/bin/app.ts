#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VoteBoardGameStack } from '../lib/vote-board-game-stack';

const app = new cdk.App();

new VoteBoardGameStack(app, 'VoteBoardGameStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
  },
});
