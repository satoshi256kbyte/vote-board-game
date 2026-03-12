/**
 * BedrockConfig - Bedrock設定の管理
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export interface BedrockConfig {
  modelId: string;
  region: string;
  maxTokens: number;
  temperature: number;
  topP: number;
}

/**
 * 環境変数からBedrock設定を読み込む
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 *
 * @returns BedrockConfig - 環境変数またはデフォルト値から読み込まれた設定
 */
export function loadBedrockConfig(): BedrockConfig {
  return {
    modelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0',
    region: process.env.BEDROCK_REGION || 'ap-northeast-1',
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '2048', 10),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.BEDROCK_TOP_P || '0.9'),
  };
}
