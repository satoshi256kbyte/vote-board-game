/**
 * AWS Client Factory with credential refresh support
 *
 * OIDCセッション（デフォルト1時間）が切れた場合に
 * ExpiredTokenExceptionをキャッチしてクライアントを再作成する
 */

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = () => process.env.AWS_REGION || 'ap-northeast-1';

let cognitoClient: CognitoIdentityProviderClient | null = null;
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({ region: region() });
  }
  return cognitoClient;
}

export function getDynamoDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    dynamoClient = new DynamoDBClient({ region: region() });
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

/**
 * 既存クライアントを破棄して再作成を強制する
 * ExpiredTokenException 発生時に呼び出す
 */
export function refreshClients(): void {
  console.log('[AWSClientFactory] Refreshing AWS clients due to expired credentials');
  cognitoClient?.destroy();
  dynamoClient?.destroy();
  cognitoClient = null;
  dynamoClient = null;
  docClient = null;
}

/**
 * ExpiredTokenException かどうかを判定する
 */
export function isExpiredTokenError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'ExpiredTokenException' ||
      error.message.includes('ExpiredToken') ||
      error.message.includes('expired')
    );
  }
  return false;
}

/**
 * AWS API呼び出しをリトライ付きで実行する
 * ExpiredTokenException の場合はクライアントをリフレッシュして1回リトライ
 */
export async function withCredentialRefresh<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isExpiredTokenError(error)) {
      console.warn(
        '[AWSClientFactory] Caught ExpiredTokenException, refreshing clients and retrying...'
      );
      refreshClients();
      return await fn();
    }
    throw error;
  }
}
