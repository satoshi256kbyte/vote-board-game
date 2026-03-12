import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { loadBedrockConfig } from './config';

describe('Property 2: Configuration Loading with Defaults', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  /**
   * Feature: bedrock-nova-pro-integration, Property 2: Configuration Loading with Defaults
   *
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
   *
   * For any environment variable configuration (BEDROCK_MODEL_ID, BEDROCK_REGION,
   * BEDROCK_MAX_TOKENS, BEDROCK_TEMPERATURE, BEDROCK_TOP_P), when the variable is
   * not set, the configuration loader should return the documented default value.
   */
  it('should return default values when environment variables are not set', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'BEDROCK_MODEL_ID',
          'BEDROCK_REGION',
          'BEDROCK_MAX_TOKENS',
          'BEDROCK_TEMPERATURE',
          'BEDROCK_TOP_P'
        ),
        (envVar) => {
          // Clear the specific environment variable
          delete process.env[envVar];

          const config = loadBedrockConfig();

          // Define expected defaults
          const defaults = {
            BEDROCK_MODEL_ID: 'amazon.nova-pro-v1:0',
            BEDROCK_REGION: 'ap-northeast-1',
            BEDROCK_MAX_TOKENS: 2048,
            BEDROCK_TEMPERATURE: 0.7,
            BEDROCK_TOP_P: 0.9,
          };

          // Map environment variable name to config property name
          const configKeyMap: Record<string, keyof typeof config> = {
            BEDROCK_MODEL_ID: 'modelId',
            BEDROCK_REGION: 'region',
            BEDROCK_MAX_TOKENS: 'maxTokens',
            BEDROCK_TEMPERATURE: 'temperature',
            BEDROCK_TOP_P: 'topP',
          };

          const configKey = configKeyMap[envVar];
          const expectedDefault = defaults[envVar];

          // Verify the default value is used
          expect(config[configKey]).toBe(expectedDefault);
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Feature: bedrock-nova-pro-integration, Property 2: Configuration Loading with Defaults
   *
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
   *
   * For any combination of unset environment variables, the configuration loader
   * should return the documented default values for all unset variables.
   */
  it('should return default values for any combination of unset environment variables', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(
            'BEDROCK_MODEL_ID',
            'BEDROCK_REGION',
            'BEDROCK_MAX_TOKENS',
            'BEDROCK_TEMPERATURE',
            'BEDROCK_TOP_P'
          ),
          { minLength: 0, maxLength: 5 }
        ),
        (envVarsToUnset) => {
          // Clear the specified environment variables
          for (const envVar of envVarsToUnset) {
            delete process.env[envVar];
          }

          const config = loadBedrockConfig();

          // Define expected defaults
          const defaults = {
            BEDROCK_MODEL_ID: 'amazon.nova-pro-v1:0',
            BEDROCK_REGION: 'ap-northeast-1',
            BEDROCK_MAX_TOKENS: 2048,
            BEDROCK_TEMPERATURE: 0.7,
            BEDROCK_TOP_P: 0.9,
          };

          // Map environment variable name to config property name
          const configKeyMap: Record<string, keyof typeof config> = {
            BEDROCK_MODEL_ID: 'modelId',
            BEDROCK_REGION: 'region',
            BEDROCK_MAX_TOKENS: 'maxTokens',
            BEDROCK_TEMPERATURE: 'temperature',
            BEDROCK_TOP_P: 'topP',
          };

          // Verify all unset variables use default values
          for (const envVar of envVarsToUnset) {
            const configKey = configKeyMap[envVar];
            const expectedDefault = defaults[envVar];
            expect(config[configKey]).toBe(expectedDefault);
          }
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Feature: bedrock-nova-pro-integration, Property 2: Configuration Loading with Defaults
   *
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
   *
   * For any empty string value set in environment variables, the configuration
   * loader should treat it as unset and return the documented default value.
   */
  it('should return default values when environment variables are set to empty strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'BEDROCK_MODEL_ID',
          'BEDROCK_REGION',
          'BEDROCK_MAX_TOKENS',
          'BEDROCK_TEMPERATURE',
          'BEDROCK_TOP_P'
        ),
        (envVar) => {
          // Set the environment variable to empty string
          process.env[envVar] = '';

          const config = loadBedrockConfig();

          // Define expected defaults
          const defaults = {
            BEDROCK_MODEL_ID: 'amazon.nova-pro-v1:0',
            BEDROCK_REGION: 'ap-northeast-1',
            BEDROCK_MAX_TOKENS: 2048,
            BEDROCK_TEMPERATURE: 0.7,
            BEDROCK_TOP_P: 0.9,
          };

          // Map environment variable name to config property name
          const configKeyMap: Record<string, keyof typeof config> = {
            BEDROCK_MODEL_ID: 'modelId',
            BEDROCK_REGION: 'region',
            BEDROCK_MAX_TOKENS: 'maxTokens',
            BEDROCK_TEMPERATURE: 'temperature',
            BEDROCK_TOP_P: 'topP',
          };

          const configKey = configKeyMap[envVar];
          const expectedDefault = defaults[envVar];

          // Verify the default value is used
          expect(config[configKey]).toBe(expectedDefault);
        }
      ),
      { numRuns: 15, endOnFailure: true }
    );
  });

  /**
   * Feature: bedrock-nova-pro-integration, Property 2: Configuration Loading with Defaults
   *
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
   *
   * For any valid custom value set in environment variables, the configuration
   * loader should use the custom value instead of the default.
   */
  it('should use custom values when environment variables are set with valid values', () => {
    fc.assert(
      fc.property(
        fc.record({
          modelId: fc.string({ minLength: 1, maxLength: 100 }),
          region: fc.constantFrom('us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-1'),
          maxTokens: fc.integer({ min: 1, max: 100000 }),
          temperature: fc.double({ min: 0, max: 1, noNaN: true }),
          topP: fc.double({ min: 0, max: 1, noNaN: true }),
        }),
        (customValues) => {
          // Set custom environment variables
          process.env.BEDROCK_MODEL_ID = customValues.modelId;
          process.env.BEDROCK_REGION = customValues.region;
          process.env.BEDROCK_MAX_TOKENS = customValues.maxTokens.toString();
          process.env.BEDROCK_TEMPERATURE = customValues.temperature.toString();
          process.env.BEDROCK_TOP_P = customValues.topP.toString();

          const config = loadBedrockConfig();

          // Verify custom values are used
          expect(config.modelId).toBe(customValues.modelId);
          expect(config.region).toBe(customValues.region);
          expect(config.maxTokens).toBe(customValues.maxTokens);
          expect(config.temperature).toBeCloseTo(customValues.temperature, 10);
          expect(config.topP).toBeCloseTo(customValues.topP, 10);
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  /**
   * Feature: bedrock-nova-pro-integration, Property 2: Configuration Loading with Defaults
   *
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
   *
   * For any call to loadBedrockConfig() with all environment variables unset,
   * the configuration loader should consistently return the same default values.
   */
  it('should consistently return the same default values across multiple calls', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (numCalls) => {
        // Clear all environment variables
        delete process.env.BEDROCK_MODEL_ID;
        delete process.env.BEDROCK_REGION;
        delete process.env.BEDROCK_MAX_TOKENS;
        delete process.env.BEDROCK_TEMPERATURE;
        delete process.env.BEDROCK_TOP_P;

        // Call loadBedrockConfig multiple times
        const configs = Array.from({ length: numCalls }, () => loadBedrockConfig());

        // Verify all configs are identical
        const firstConfig = configs[0];
        for (let i = 1; i < configs.length; i++) {
          expect(configs[i]).toEqual(firstConfig);
        }

        // Verify default values
        expect(firstConfig).toEqual({
          modelId: 'amazon.nova-pro-v1:0',
          region: 'ap-northeast-1',
          maxTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
        });
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
