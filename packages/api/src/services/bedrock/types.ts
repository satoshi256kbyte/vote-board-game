/**
 * Type definitions for AWS Bedrock integration
 *
 * This file contains TypeScript interfaces and types used throughout the Bedrock service layer.
 *
 * Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 10.5
 */

/**
 * Message structure for Bedrock Converse API
 * Represents a single message in the conversation history
 */
export interface Message {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

/**
 * Content block within a message
 * Currently supports text content only
 */
export interface ContentBlock {
  text?: string;
}

/**
 * System message for setting context and instructions
 */
export interface SystemMessage {
  text: string;
}

/**
 * Parameters for the Bedrock Converse API
 */
export interface ConverseParams {
  modelId: string;
  messages: Message[];
  system?: SystemMessage[];
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
}

/**
 * Parameters for generating text using Bedrock
 */
export interface GenerateTextParams {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Response from text generation
 */
export interface GenerateTextResponse {
  text: string;
  usage: TokenUsageMetrics;
}

/**
 * Token usage metrics for a Bedrock API call
 */
export interface TokenUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Structured log entry for Bedrock operations
 * Used for monitoring, debugging, and cost tracking
 */
export interface BedrockLogEntry {
  timestamp: string;
  modelId: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  type: 'BEDROCK_TOKEN_USAGE' | 'BEDROCK_ERROR' | 'BEDROCK_RETRY';
  errorType?: string;
  errorMessage?: string;
  attemptNumber?: number;
}
