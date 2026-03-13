/**
 * Bedrock Integration Tests
 *
 * BedrockServiceの初期化からAPI呼び出しまでのE2Eテスト
 * Requirements: 9.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BedrockClient } from './bedrock-client.js';
import { BedrockService } from './bedrock-service.js';
import { RetryHandler } from './retry-handler.js';
import { TokenCounter } from './token-counter.js';
import { loadBedrockConfig } from './config.js';
import type { BedrockConfig } from './config.js';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// AWS SDKのモック
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  ConverseCommand: vi.fn((params) => params),
  ConverseStreamCommand: vi.fn((params) => params),
}));

describe('Bedrock Integration Tests', () => {
  let config: BedrockConfig;
  let client: BedrockClient;
  let retryHandler: RetryHandler;
  let tokenCounter: TokenCounter;
  let bedrockService: BedrockService;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 環境変数をクリア
    delete process.env.BEDROCK_MODEL_ID;
    delete process.env.BEDROCK_REGION;
    delete process.env.BEDROCK_MAX_TOKENS;
    delete process.env.BEDROCK_TEMPERATURE;
    delete process.env.BEDROCK_TOP_P;

    // BedrockClientのシングルトンをリセット
    BedrockClient.resetInstance();

    // モックを作成
    mockSend = vi.fn();
    vi.mocked(BedrockRuntimeClient).mockImplementation(
      () =>
        ({
          send: mockSend,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );

    // 設定を読み込み
    config = loadBedrockConfig();

    // クライアントを初期化
    client = BedrockClient.getInstance(config.region);

    // ユーティリティを初期化
    retryHandler = new RetryHandler(3, 100); // テスト用に短い遅延
    tokenCounter = new TokenCounter();

    // サービスを初期化
    bedrockService = new BedrockService(client, retryHandler, tokenCounter, config);

    // console.logをモック
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('E2E: 初期化からAPI呼び出しまで', () => {
    it('should successfully initialize and call generateText', async () => {
      // Requirements: 1.3, 3.1, 3.6, 10.1, 10.2

      // モックレスポンスを設定
      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Generated response from Nova Pro' }],
          },
        },
        usage: {
          inputTokens: 50,
          outputTokens: 20,
        },
        $metadata: {
          requestId: 'test-request-id',
        },
      });

      // generateTextを呼び出し
      const response = await bedrockService.generateText({
        prompt: 'Test prompt for integration test',
        systemPrompt: 'You are a helpful assistant',
      });

      // レスポンスを検証
      expect(response.text).toBe('Generated response from Nova Pro');
      expect(response.usage.inputTokens).toBe(50);
      expect(response.usage.outputTokens).toBe(20);
      expect(response.usage.totalTokens).toBe(70);

      // API呼び出しを検証
      expect(mockSend).toHaveBeenCalledTimes(1);

      // ログ出力を検証
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_REQUEST'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_TOKEN_USAGE'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_SUCCESS'));
    });

    it('should use singleton client across multiple calls', async () => {
      // Requirements: 1.3

      // 複数回generateTextを呼び出し
      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Response 1' }],
          },
        },
        usage: {
          inputTokens: 10,
          outputTokens: 5,
        },
        $metadata: {
          requestId: 'req-1',
        },
      });

      await bedrockService.generateText({ prompt: 'First call' });

      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Response 2' }],
          },
        },
        usage: {
          inputTokens: 15,
          outputTokens: 8,
        },
        $metadata: {
          requestId: 'req-2',
        },
      });

      await bedrockService.generateText({ prompt: 'Second call' });

      // 同じクライアントインスタンスが使用されていることを確認
      const client1 = BedrockClient.getInstance();
      const client2 = BedrockClient.getInstance();
      expect(client1).toBe(client2);

      // 両方の呼び出しが成功
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('E2E: エラーハンドリングの統合', () => {
    it('should handle throttling errors with retry', async () => {
      // Requirements: 4.1, 4.5

      // 最初の2回はスロットリングエラー、3回目は成功
      mockSend
        .mockRejectedValueOnce(
          Object.assign(new Error('Rate exceeded'), { name: 'ThrottlingException' })
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('Rate exceeded'), { name: 'ThrottlingException' })
        )
        .mockResolvedValueOnce({
          output: {
            message: {
              content: [{ text: 'Success after retry' }],
            },
          },
          usage: {
            inputTokens: 30,
            outputTokens: 15,
          },
          $metadata: {
            requestId: 'retry-success',
          },
        });

      const response = await bedrockService.generateText({
        prompt: 'Test retry logic',
      });

      // 最終的に成功
      expect(response.text).toBe('Success after retry');
      expect(mockSend).toHaveBeenCalledTimes(3);

      // リトライログを検証（JSON形式）
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_RETRY'));
    });

    it('should handle validation errors without retry', async () => {
      // Requirements: 4.2

      // 空のプロンプトでバリデーションエラー
      await expect(bedrockService.generateText({ prompt: '' })).rejects.toThrow(
        'Prompt cannot be empty'
      );

      // API呼び出しは行われない
      expect(mockSend).not.toHaveBeenCalled();

      // エラーログを検証
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_REQUEST'));
    });

    it('should handle model not found errors', async () => {
      // Requirements: 4.3

      mockSend.mockRejectedValue(
        Object.assign(new Error('Model not found'), {
          name: 'ResourceNotFoundException',
        })
      );

      await expect(bedrockService.generateText({ prompt: 'Test model error' })).rejects.toThrow(
        'Model not found'
      );

      // リトライされない（1回のみ）
      expect(mockSend).toHaveBeenCalledTimes(1);

      // エラーログを検証
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_ERROR'));
    });

    it('should exhaust retries and throw error', async () => {
      // Requirements: 4.5

      // すべての試行でタイムアウトエラー
      mockSend.mockRejectedValue(
        Object.assign(new Error('Request timeout'), { name: 'TimeoutError' })
      );

      await expect(bedrockService.generateText({ prompt: 'Test timeout' })).rejects.toThrow(
        'Request timeout'
      );

      // 最大リトライ回数（初回 + 3回リトライ = 4回）
      // Note: RetryHandlerはmaxRetries=3で初期化されているため、4回の試行が行われる
      expect(mockSend).toHaveBeenCalledTimes(4);
    });
  });

  describe('E2E: トークンカウントとロギング', () => {
    it('should log token usage for successful calls', async () => {
      // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5

      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Test response' }],
          },
        },
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
        $metadata: {
          requestId: 'token-test',
        },
      });

      await bedrockService.generateText({
        prompt: 'Test token counting',
      });

      // トークン使用量ログを検証
      const tokenLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.find((call) =>
        call[0].includes('BEDROCK_TOKEN_USAGE')
      );

      expect(tokenLog).toBeDefined();
      const logEntry = JSON.parse(tokenLog![0]);
      expect(logEntry.inputTokens).toBe(100);
      expect(logEntry.outputTokens).toBe(50);
      expect(logEntry.totalTokens).toBe(150);
      expect(logEntry.modelId).toBe('amazon.nova-pro-v1:0');
    });

    it('should log request and response metadata', async () => {
      // Requirements: 10.1, 10.2, 10.5

      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Metadata test' }],
          },
        },
        usage: {
          inputTokens: 25,
          outputTokens: 10,
        },
        $metadata: {
          requestId: 'metadata-test-id',
        },
      });

      await bedrockService.generateText({
        prompt: 'Test metadata logging',
      });

      // リクエストログを検証
      const requestLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.find((call) =>
        call[0].includes('BEDROCK_REQUEST')
      );
      expect(requestLog).toBeDefined();
      const requestEntry = JSON.parse(requestLog![0]);
      expect(requestEntry.type).toBe('BEDROCK_REQUEST');
      expect(requestEntry.timestamp).toBeDefined();
      expect(requestEntry.requestId).toBeDefined();

      // 成功ログを検証
      const successLog = (console.log as ReturnType<typeof vi.fn>).mock.calls.find((call) =>
        call[0].includes('BEDROCK_SUCCESS')
      );
      expect(successLog).toBeDefined();
      const successEntry = JSON.parse(successLog![0]);
      expect(successEntry.type).toBe('BEDROCK_SUCCESS');
      expect(successEntry.responseTime).toBeGreaterThanOrEqual(0);
      expect(successEntry.requestId).toBe('metadata-test-id');
    });

    it('should not log sensitive prompt data', async () => {
      // Requirements: 10.6

      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Response' }],
          },
        },
        usage: {
          inputTokens: 20,
          outputTokens: 10,
        },
        $metadata: {
          requestId: 'sensitive-test',
        },
      });

      const sensitivePrompt = 'This is sensitive user data that should not be logged';
      await bedrockService.generateText({
        prompt: sensitivePrompt,
      });

      // すべてのログエントリを確認
      const allLogs = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0]);

      // プロンプトがログに含まれていないことを確認
      allLogs.forEach((log) => {
        expect(log).not.toContain(sensitivePrompt);
      });
    });
  });

  describe('E2E: 環境変数による設定', () => {
    it('should use environment variables when set', async () => {
      // Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

      // 環境変数を設定
      process.env.BEDROCK_MODEL_ID = 'custom-model-id';
      process.env.BEDROCK_REGION = 'us-east-1';
      process.env.BEDROCK_MAX_TOKENS = '1024';
      process.env.BEDROCK_TEMPERATURE = '0.5';
      process.env.BEDROCK_TOP_P = '0.8';

      // 新しい設定で再初期化
      BedrockClient.resetInstance();
      const customConfig = loadBedrockConfig();
      const customClient = BedrockClient.getInstance(customConfig.region);
      const customService = new BedrockService(
        customClient,
        retryHandler,
        tokenCounter,
        customConfig
      );

      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [{ text: 'Custom config response' }],
          },
        },
        usage: {
          inputTokens: 10,
          outputTokens: 5,
        },
        $metadata: {
          requestId: 'custom-config',
        },
      });

      await customService.generateText({
        prompt: 'Test custom config',
      });

      // カスタム設定が使用されていることを確認
      expect(customConfig.modelId).toBe('custom-model-id');
      expect(customConfig.region).toBe('us-east-1');
      expect(customConfig.maxTokens).toBe(1024);
      expect(customConfig.temperature).toBe(0.5);
      expect(customConfig.topP).toBe(0.8);
    });
  });

  describe('E2E: Batch Lambda統合シナリオ', () => {
    it('should simulate batch Lambda initialization and usage', async () => {
      // Requirements: 1.3, 3.1, 3.6, 10.1, 10.2

      // Lambda実行環境をシミュレート（コールドスタート）
      BedrockClient.resetInstance();

      const batchConfig = loadBedrockConfig();
      const batchClient = BedrockClient.getInstance(batchConfig.region);
      const batchRetryHandler = new RetryHandler(3, 1000);
      const batchTokenCounter = new TokenCounter();
      const batchService = new BedrockService(
        batchClient,
        batchRetryHandler,
        batchTokenCounter,
        batchConfig
      );

      // オセロの次の一手候補生成をシミュレート
      mockSend.mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  candidates: [
                    {
                      position: 'D3',
                      description: '中央を制御する基本的な手です。',
                      effect: '相手の選択肢を制限します。',
                    },
                    {
                      position: 'C4',
                      description: '攻撃的な展開を狙う手です。',
                      effect: '盤面の主導権を握ります。',
                    },
                    {
                      position: 'E6',
                      description: '守備的な配置を重視する手です。',
                      effect: '安定した展開が期待できます。',
                    },
                  ],
                }),
              },
            ],
          },
        },
        usage: {
          inputTokens: 150,
          outputTokens: 200,
        },
        $metadata: {
          requestId: 'batch-simulation',
        },
      });

      const response = await batchService.generateText({
        prompt: `あなたはオセロの専門家です。以下の盤面状態から、次の一手の候補を3つ提案してください。

盤面状態: 初期配置（中央に白黒が配置された状態）
現在の手番: 黒

各候補について、以下の情報を含めてください：
1. 手の位置（例: D3）
2. 手の説明（200文字以内）
3. 期待される効果

JSON形式で回答してください。`,
        systemPrompt: 'あなたはオセロの専門家として、初心者にもわかりやすく次の一手を提案します。',
        maxTokens: 1000,
      });

      // レスポンスを検証
      expect(response.text).toBeDefined();
      const candidates = JSON.parse(response.text);
      expect(candidates.candidates).toHaveLength(3);
      expect(candidates.candidates[0].position).toBe('D3');

      // トークン使用量を検証
      expect(response.usage.inputTokens).toBe(150);
      expect(response.usage.outputTokens).toBe(200);
      expect(response.usage.totalTokens).toBe(350);

      // ログが正しく出力されていることを確認
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_REQUEST'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_TOKEN_USAGE'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('BEDROCK_SUCCESS'));
    });
  });
});
