/**
 * AWS Bedrock (Nova Pro) Integration
 *
 * This module provides integration with AWS Bedrock's Nova Pro model for AI-powered features
 * in the Vote Board Game application.
 *
 * Requirements: 1.1, 1.2
 */

// Error classes
export {
  BedrockError,
  BedrockValidationError,
  BedrockModelNotFoundError,
  BedrockRetryFailedError,
} from './errors';

// Configuration
export type { BedrockConfig } from './config';
export { loadBedrockConfig } from './config';

// Token counter
export { TokenCounter } from './token-counter';
export type { TokenUsage } from './token-counter';

// Bedrock client
export { BedrockClient } from './bedrock-client';

// Retry handler
export { RetryHandler } from './retry-handler';

// Bedrock service
export { BedrockService } from './bedrock-service';
export type { GenerateTextStreamResponse } from './bedrock-service';

// Types
export type {
  Message,
  ContentBlock,
  SystemMessage,
  TokenUsageMetrics,
  BedrockLogEntry,
  ConverseParams,
  GenerateTextParams,
  GenerateTextResponse,
} from './types';
