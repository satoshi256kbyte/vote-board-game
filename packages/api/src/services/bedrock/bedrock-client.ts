/**
 * BedrockClient - AWS Bedrock APIとの通信を管理
 *
 * Lambda実行環境で1度だけ初期化され、複数の呼び出しで再利用される
 * シングルトンパターンを使用してコールドスタートのオーバーヘッドを最小化
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 8.1, 8.2
 */

import {
    BedrockRuntimeClient,
    ConverseCommand,
    ConverseStreamCommand,
    type ConverseCommandOutput,
    type ConverseStreamCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import type { ConverseParams } from './types.js';

/**
 * BedrockClient - AWS Bedrock Runtime APIとの通信を担当するシングルトンクラス
 */
export class BedrockClient {
    private static instance: BedrockClient | null = null;
    private client: BedrockRuntimeClient;

    /**
     * プライベートコンストラクタ（シングルトンパターン）
     * @param region - AWS リージョン
     */
    private constructor(region: string) {
        this.client = new BedrockRuntimeClient({
            region,
            // Lambda実行ロールの認証情報を自動使用
        });
    }

    /**
     * シングルトンインスタンスを取得
     * Requirements: 1.3
     *
     * @param region - AWS リージョン（デフォルト: ap-northeast-1）
     * @returns BedrockClient インスタンス
     */
    public static getInstance(region: string = 'ap-northeast-1'): BedrockClient {
        if (!BedrockClient.instance) {
            BedrockClient.instance = new BedrockClient(region);
        }
        return BedrockClient.instance;
    }

    /**
     * テスト用: インスタンスをリセット
     * テスト間でシングルトンをクリーンアップするために使用
     */
    public static resetInstance(): void {
        BedrockClient.instance = null;
    }

    /**
     * converse APIを使用してプロンプトを送信
     * Requirements: 3.1, 3.2, 3.3
     *
     * @param params - Converse API パラメータ
     * @returns Converse API レスポンス
     */
    public async converse(params: ConverseParams): Promise<ConverseCommandOutput> {
        const command = new ConverseCommand({
            modelId: params.modelId,
            messages: params.messages,
            system: params.system,
            inferenceConfig: params.inferenceConfig,
        });

        return await this.client.send(command);
    }

    /**
     * converseStream APIを使用してストリーミングレスポンスを取得
     * Requirements: 8.1, 8.2
     *
     * @param params - Converse API パラメータ
     * @returns ストリーミングレスポンス
     */
    public async converseStream(params: ConverseParams): Promise<ConverseStreamCommandOutput> {
        const command = new ConverseStreamCommand({
            modelId: params.modelId,
            messages: params.messages,
            system: params.system,
            inferenceConfig: params.inferenceConfig,
        });

        return await this.client.send(command);
    }
}
