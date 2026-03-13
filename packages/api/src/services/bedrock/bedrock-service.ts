/**
 * BedrockService - Bedrock統合のビジネスロジック層
 *
 * このサービスは、AWS Bedrock (Nova Pro) を使用したテキスト生成機能を提供します。
 * プロンプトのバリデーション、API呼び出し、エラーハンドリング、トークンカウント、ロギングを担当します。
 *
 * Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 4.6, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.6
 */

import type { BedrockClient } from './bedrock-client.js';
import type { RetryHandler } from './retry-handler.js';
import type { TokenCounter } from './token-counter.js';
import type { BedrockConfig } from './config.js';
import { BedrockValidationError } from './errors.js';
import type { Message, SystemMessage, GenerateTextParams, GenerateTextResponse } from './types.js';

/**
 * ストリーミングレスポンスの型定義
 */
export interface GenerateTextStreamResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  hasError: boolean;
  errorMessage?: string;
}

/**
 * BedrockService - Bedrock統合のビジネスロジック層
 */
export class BedrockService {
  private client: BedrockClient;
  private retryHandler: RetryHandler;
  private tokenCounter: TokenCounter;
  private config: BedrockConfig;

  constructor(
    client: BedrockClient,
    retryHandler: RetryHandler,
    tokenCounter: TokenCounter,
    config: BedrockConfig
  ) {
    this.client = client;
    this.retryHandler = retryHandler;
    this.tokenCounter = tokenCounter;
    this.config = config;
  }

  /**
   * プロンプトを送信してテキストレスポンスを取得
   * Requirements: 3.1, 3.4, 3.5, 3.6
   *
   * @param params - テキスト生成パラメータ
   * @returns テキスト生成レスポンス
   * @throws BedrockValidationError - プロンプトが空または長すぎる場合
   */
  public async generateText(params: GenerateTextParams): Promise<GenerateTextResponse> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // リクエスト開始をログに記録
    // Requirements: 10.1, 10.5
    const requestLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'BEDROCK_REQUEST',
      requestId,
      // プロンプトは記録しない（機密情報の可能性があるため）
      // Requirements: 10.6
    };
    console.log(JSON.stringify(requestLogEntry));

    // バリデーション
    // Requirements: 3.4, 12.4
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new BedrockValidationError('Prompt cannot be empty');
    }

    // Requirements: 3.5
    if (params.prompt.length > 100000) {
      throw new BedrockValidationError('Prompt exceeds maximum length of 100,000 characters');
    }

    // メッセージを構築
    // Requirements: 3.1, 3.2, 3.3
    const messages: Message[] = [
      {
        role: 'user',
        content: [{ text: params.prompt }],
      },
    ];

    const systemMessages: SystemMessage[] | undefined = params.systemPrompt
      ? [{ text: params.systemPrompt }]
      : undefined;

    try {
      // リトライハンドラーを使用して実行
      // Requirements: 4.1, 4.4, 4.5
      const response = await this.retryHandler.execute(async () => {
        return await this.client.converse({
          modelId: this.config.modelId,
          messages,
          system: systemMessages,
          inferenceConfig: {
            temperature: params.temperature ?? this.config.temperature,
            topP: this.config.topP,
            maxTokens: params.maxTokens ?? this.config.maxTokens,
          },
        });
      });

      // レスポンスからテキストを抽出
      // Requirements: 3.6
      const text = response.output?.message?.content?.[0]?.text || '';

      const inputTokens = response.usage?.inputTokens || 0;
      const outputTokens = response.usage?.outputTokens || 0;
      const totalTokens = inputTokens + outputTokens;

      // トークン使用量を記録
      // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
      this.tokenCounter.recordUsage({
        modelId: this.config.modelId,
        inputTokens,
        outputTokens,
        requestId: response.$metadata.requestId || requestId,
      });

      // 成功レスポンスをログに記録
      // Requirements: 10.2, 10.5
      const responseTime = Date.now() - startTime;
      const successLogEntry = {
        timestamp: new Date().toISOString(),
        type: 'BEDROCK_SUCCESS',
        requestId: response.$metadata.requestId || requestId,
        responseTime,
        inputTokens,
        outputTokens,
        totalTokens,
      };
      console.log(JSON.stringify(successLogEntry));

      return {
        text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
        },
      };
    } catch (error) {
      // エラーをログに記録
      // Requirements: 4.6, 10.3, 10.5
      const errorLogEntry = {
        timestamp: new Date().toISOString(),
        type: 'BEDROCK_ERROR',
        requestId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        // プロンプトは記録しない（機密情報の可能性があるため）
        // Requirements: 10.6
      };
      console.log(JSON.stringify(errorLogEntry));

      throw error;
    }
  }

  /**
   * ストリーミングレスポンスを取得
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   *
   * @param params - テキスト生成パラメータ
   * @returns ストリーミングレスポンス
   */
  public async generateTextStream(params: GenerateTextParams): Promise<GenerateTextStreamResponse> {
    // バリデーション（generateTextと同じ）
    // Requirements: 3.4
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new BedrockValidationError('Prompt cannot be empty');
    }

    // Requirements: 3.5
    if (params.prompt.length > 100000) {
      throw new BedrockValidationError('Prompt exceeds maximum length of 100,000 characters');
    }

    // メッセージを構築
    const messages: Message[] = [
      {
        role: 'user',
        content: [{ text: params.prompt }],
      },
    ];

    const systemMessages: SystemMessage[] | undefined = params.systemPrompt
      ? [{ text: params.systemPrompt }]
      : undefined;

    try {
      // Requirements: 8.1, 8.2
      const response = await this.client.converseStream({
        modelId: this.config.modelId,
        messages,
        system: systemMessages,
        inferenceConfig: {
          temperature: params.temperature ?? this.config.temperature,
          topP: this.config.topP,
          maxTokens: params.maxTokens ?? this.config.maxTokens,
        },
      });

      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      // ストリーミングチャンクを集約
      // Requirements: 8.3, 8.4
      if (response.stream) {
        for await (const chunk of response.stream) {
          if (chunk.contentBlockDelta?.delta?.text) {
            fullText += chunk.contentBlockDelta.delta.text;
          }

          if (chunk.metadata?.usage) {
            inputTokens = chunk.metadata.usage.inputTokens || 0;
            outputTokens = chunk.metadata.usage.outputTokens || 0;
          }
        }
      }

      // トークン使用量を記録
      this.tokenCounter.recordUsage({
        modelId: this.config.modelId,
        inputTokens,
        outputTokens,
        requestId: 'stream',
      });

      return {
        text: fullText,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        hasError: false,
      };
    } catch (error) {
      // ストリーミング中のエラーをログ
      // Requirements: 8.5
      console.error('Streaming error:', error);

      return {
        text: '',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown streaming error',
      };
    }
  }
}
