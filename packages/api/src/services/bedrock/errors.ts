/**
 * Custom error classes for Bedrock service
 *
 * This file defines the error hierarchy for the Bedrock integration,
 * providing specific error types for different failure scenarios.
 *
 * Requirements: 4.2, 4.3, 4.5
 */

/**
 * Bedrockサービスのベースエラー
 */
export class BedrockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BedrockError';
  }
}

/**
 * バリデーションエラー
 * Requirements: 4.2
 */
export class BedrockValidationError extends BedrockError {
  constructor(message: string) {
    super(message);
    this.name = 'BedrockValidationError';
  }
}

/**
 * モデルが見つからないエラー
 * Requirements: 4.3
 */
export class BedrockModelNotFoundError extends BedrockError {
  constructor(message: string) {
    super(message);
    this.name = 'BedrockModelNotFoundError';
  }
}

/**
 * リトライ失敗エラー
 * Requirements: 4.5
 */
export class BedrockRetryFailedError extends BedrockError {
  constructor(
    message: string,
    public readonly cause: Error
  ) {
    super(message);
    this.name = 'BedrockRetryFailedError';
  }
}
