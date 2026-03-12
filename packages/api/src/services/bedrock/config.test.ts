import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadBedrockConfig } from './config';

describe('loadBedrockConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('環境変数が設定されている場合', () => {
    it('すべての環境変数が設定されている場合、それらの値を返す', () => {
      process.env.BEDROCK_MODEL_ID = 'custom-model-id';
      process.env.BEDROCK_REGION = 'us-west-2';
      process.env.BEDROCK_MAX_TOKENS = '4096';
      process.env.BEDROCK_TEMPERATURE = '0.5';
      process.env.BEDROCK_TOP_P = '0.8';

      const config = loadBedrockConfig();

      expect(config).toEqual({
        modelId: 'custom-model-id',
        region: 'us-west-2',
        maxTokens: 4096,
        temperature: 0.5,
        topP: 0.8,
      });
    });

    it('BEDROCK_MODEL_IDのみ設定されている場合、その値を使用し他はデフォルト値を返す', () => {
      process.env.BEDROCK_MODEL_ID = 'custom-model';
      delete process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_MAX_TOKENS;
      delete process.env.BEDROCK_TEMPERATURE;
      delete process.env.BEDROCK_TOP_P;

      const config = loadBedrockConfig();

      expect(config.modelId).toBe('custom-model');
      expect(config.region).toBe('ap-northeast-1');
      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.7);
      expect(config.topP).toBe(0.9);
    });

    it('BEDROCK_REGIONのみ設定されている場合、その値を使用し他はデフォルト値を返す', () => {
      delete process.env.BEDROCK_MODEL_ID;
      process.env.BEDROCK_REGION = 'eu-west-1';
      delete process.env.BEDROCK_MAX_TOKENS;
      delete process.env.BEDROCK_TEMPERATURE;
      delete process.env.BEDROCK_TOP_P;

      const config = loadBedrockConfig();

      expect(config.modelId).toBe('amazon.nova-pro-v1:0');
      expect(config.region).toBe('eu-west-1');
      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.7);
      expect(config.topP).toBe(0.9);
    });

    it('BEDROCK_MAX_TOKENSのみ設定されている場合、その値を使用し他はデフォルト値を返す', () => {
      delete process.env.BEDROCK_MODEL_ID;
      delete process.env.BEDROCK_REGION;
      process.env.BEDROCK_MAX_TOKENS = '1024';
      delete process.env.BEDROCK_TEMPERATURE;
      delete process.env.BEDROCK_TOP_P;

      const config = loadBedrockConfig();

      expect(config.modelId).toBe('amazon.nova-pro-v1:0');
      expect(config.region).toBe('ap-northeast-1');
      expect(config.maxTokens).toBe(1024);
      expect(config.temperature).toBe(0.7);
      expect(config.topP).toBe(0.9);
    });

    it('BEDROCK_TEMPERATUREのみ設定されている場合、その値を使用し他はデフォルト値を返す', () => {
      delete process.env.BEDROCK_MODEL_ID;
      delete process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_MAX_TOKENS;
      process.env.BEDROCK_TEMPERATURE = '0.3';
      delete process.env.BEDROCK_TOP_P;

      const config = loadBedrockConfig();

      expect(config.modelId).toBe('amazon.nova-pro-v1:0');
      expect(config.region).toBe('ap-northeast-1');
      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.3);
      expect(config.topP).toBe(0.9);
    });

    it('BEDROCK_TOP_Pのみ設定されている場合、その値を使用し他はデフォルト値を返す', () => {
      delete process.env.BEDROCK_MODEL_ID;
      delete process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_MAX_TOKENS;
      delete process.env.BEDROCK_TEMPERATURE;
      process.env.BEDROCK_TOP_P = '0.95';

      const config = loadBedrockConfig();

      expect(config.modelId).toBe('amazon.nova-pro-v1:0');
      expect(config.region).toBe('ap-northeast-1');
      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.7);
      expect(config.topP).toBe(0.95);
    });

    it('数値型の環境変数が文字列として設定されている場合、正しく数値に変換される', () => {
      process.env.BEDROCK_MAX_TOKENS = '8192';
      process.env.BEDROCK_TEMPERATURE = '0.1';
      process.env.BEDROCK_TOP_P = '0.99';

      const config = loadBedrockConfig();

      expect(config.maxTokens).toBe(8192);
      expect(typeof config.maxTokens).toBe('number');
      expect(config.temperature).toBe(0.1);
      expect(typeof config.temperature).toBe('number');
      expect(config.topP).toBe(0.99);
      expect(typeof config.topP).toBe('number');
    });

    it('小数点を含む温度とtopPの値が正しく解析される', () => {
      process.env.BEDROCK_TEMPERATURE = '0.123';
      process.env.BEDROCK_TOP_P = '0.456';

      const config = loadBedrockConfig();

      expect(config.temperature).toBe(0.123);
      expect(config.topP).toBe(0.456);
    });
  });

  describe('環境変数が未設定の場合のデフォルト値', () => {
    it('すべての環境変数が未設定の場合、デフォルト値を返す', () => {
      delete process.env.BEDROCK_MODEL_ID;
      delete process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_MAX_TOKENS;
      delete process.env.BEDROCK_TEMPERATURE;
      delete process.env.BEDROCK_TOP_P;

      const config = loadBedrockConfig();

      expect(config).toEqual({
        modelId: 'amazon.nova-pro-v1:0',
        region: 'ap-northeast-1',
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      });
    });

    it('modelIdのデフォルト値はamazon.nova-pro-v1:0である', () => {
      delete process.env.BEDROCK_MODEL_ID;

      const config = loadBedrockConfig();

      expect(config.modelId).toBe('amazon.nova-pro-v1:0');
    });

    it('regionのデフォルト値はap-northeast-1である', () => {
      delete process.env.BEDROCK_REGION;

      const config = loadBedrockConfig();

      expect(config.region).toBe('ap-northeast-1');
    });

    it('maxTokensのデフォルト値は2048である', () => {
      delete process.env.BEDROCK_MAX_TOKENS;

      const config = loadBedrockConfig();

      expect(config.maxTokens).toBe(2048);
    });

    it('temperatureのデフォルト値は0.7である', () => {
      delete process.env.BEDROCK_TEMPERATURE;

      const config = loadBedrockConfig();

      expect(config.temperature).toBe(0.7);
    });

    it('topPのデフォルト値は0.9である', () => {
      delete process.env.BEDROCK_TOP_P;

      const config = loadBedrockConfig();

      expect(config.topP).toBe(0.9);
    });
  });

  describe('環境変数が空文字列の場合', () => {
    it('空文字列が設定されている場合、デフォルト値を使用する', () => {
      process.env.BEDROCK_MODEL_ID = '';
      process.env.BEDROCK_REGION = '';
      process.env.BEDROCK_MAX_TOKENS = '';
      process.env.BEDROCK_TEMPERATURE = '';
      process.env.BEDROCK_TOP_P = '';

      const config = loadBedrockConfig();

      expect(config).toEqual({
        modelId: 'amazon.nova-pro-v1:0',
        region: 'ap-northeast-1',
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      });
    });
  });

  describe('型の検証', () => {
    it('返される設定オブジェクトがBedrockConfig型に準拠している', () => {
      const config = loadBedrockConfig();

      expect(typeof config.modelId).toBe('string');
      expect(typeof config.region).toBe('string');
      expect(typeof config.maxTokens).toBe('number');
      expect(typeof config.temperature).toBe('number');
      expect(typeof config.topP).toBe('number');
    });

    it('複数回呼び出しても同じデフォルト値を返す', () => {
      delete process.env.BEDROCK_MODEL_ID;
      delete process.env.BEDROCK_REGION;
      delete process.env.BEDROCK_MAX_TOKENS;
      delete process.env.BEDROCK_TEMPERATURE;
      delete process.env.BEDROCK_TOP_P;

      const config1 = loadBedrockConfig();
      const config2 = loadBedrockConfig();

      expect(config1).toEqual(config2);
    });
  });

  describe('エッジケース', () => {
    it('maxTokensが0の場合、0を返す', () => {
      process.env.BEDROCK_MAX_TOKENS = '0';

      const config = loadBedrockConfig();

      expect(config.maxTokens).toBe(0);
    });

    it('temperatureが0の場合、0を返す', () => {
      process.env.BEDROCK_TEMPERATURE = '0';

      const config = loadBedrockConfig();

      expect(config.temperature).toBe(0);
    });

    it('topPが0の場合、0を返す', () => {
      process.env.BEDROCK_TOP_P = '0';

      const config = loadBedrockConfig();

      expect(config.topP).toBe(0);
    });

    it('temperatureが1の場合、1を返す', () => {
      process.env.BEDROCK_TEMPERATURE = '1';

      const config = loadBedrockConfig();

      expect(config.temperature).toBe(1);
    });

    it('topPが1の場合、1を返す', () => {
      process.env.BEDROCK_TOP_P = '1';

      const config = loadBedrockConfig();

      expect(config.topP).toBe(1);
    });

    it('maxTokensが非常に大きい値の場合、その値を返す', () => {
      process.env.BEDROCK_MAX_TOKENS = '100000';

      const config = loadBedrockConfig();

      expect(config.maxTokens).toBe(100000);
    });

    it('無効な数値文字列の場合、NaNを返す', () => {
      process.env.BEDROCK_MAX_TOKENS = 'invalid';
      process.env.BEDROCK_TEMPERATURE = 'not-a-number';
      process.env.BEDROCK_TOP_P = 'abc';

      const config = loadBedrockConfig();

      expect(Number.isNaN(config.maxTokens)).toBe(true);
      expect(Number.isNaN(config.temperature)).toBe(true);
      expect(Number.isNaN(config.topP)).toBe(true);
    });
  });
});
