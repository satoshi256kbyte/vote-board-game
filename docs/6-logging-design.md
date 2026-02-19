---
inclusion: manual
---

# ログ設計

## ログレベル

### 環境別ログレベル

| 環境     | ログレベル |
| :------- | :--------- |
| 開発環境 | DEBUG      |
| ステージ | DEBUG      |
| 本番環境 | INFO       |

### ログレベル定義

| レベル | 用途                                       | 例                                    |
| :----- | :----------------------------------------- | :------------------------------------ |
| ERROR  | エラー、例外                               | API エラー、DB エラー、予期しない例外 |
| WARN   | 警告、潜在的な問題                         | レート制限超過、リトライ発生          |
| INFO   | 重要なイベント                             | API リクエスト、DB クエリ、バッチ実行 |
| DEBUG  | デバッグ情報                               | 関数の入出力、中間処理の状態          |
| TRACE  | 詳細なトレース情報（本プロジェクト不使用） | -                                     |

## ログ出力先

### CloudWatch Logs

- すべてのログを CloudWatch Logs に出力
- 保持期間: 7 日間
- ロググループ:
  - `/aws/lambda/vote-board-game-api-{env}`
  - `/aws/lambda/vote-board-game-batch-{env}`

## ログフォーマット

### JSON 形式

```json
{
  "timestamp": "2025-02-19T10:00:00.000Z",
  "level": "INFO",
  "message": "API request received",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "USER#123e4567-e89b-12d3-a456-426614174000",
  "method": "POST",
  "path": "/games/456/votes",
  "statusCode": 201,
  "duration": 123,
  "context": {
    "gameId": "456e7890-e89b-12d3-a456-426614174001",
    "turnNumber": 5
  }
}
```

### 必須フィールド

- `timestamp`: ISO 8601 形式のタイムスタンプ
- `level`: ログレベル
- `message`: ログメッセージ
- `requestId`: リクエスト ID（Lambda の RequestId）

### オプションフィールド

- `userId`: ユーザー ID（認証済みの場合）
- `method`: HTTP メソッド
- `path`: リクエストパス
- `statusCode`: HTTP ステータスコード
- `duration`: 処理時間（ミリ秒）
- `context`: コンテキスト情報（任意のオブジェクト）
- `error`: エラー情報（スタックトレース含む）

## ログ出力ルール

### 機密情報の除外

以下の情報はログに出力しない:

- パスワード
- JWT トークン（Bearer トークン全体）
- リフレッシュトークン
- クレジットカード情報
- 個人を特定できる情報（メールアドレスは除く）

### マスキング

以下の情報はマスキングして出力:

- メールアドレス: `u***@example.com`
- ユーザー ID: 最初の 8 文字のみ表示 `123e4567-****`

### API リクエスト・レスポンス

#### リクエスト（INFO）

```json
{
  "timestamp": "2025-02-19T10:00:00.000Z",
  "level": "INFO",
  "message": "API request received",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "USER#123e4567-****",
  "method": "POST",
  "path": "/games/456/turns/5/votes",
  "headers": {
    "user-agent": "Mozilla/5.0...",
    "content-type": "application/json"
  },
  "body": {
    "candidateId": "789e0123-e89b-12d3-a456-426614174002"
  }
}
```

#### レスポンス（INFO）

```json
{
  "timestamp": "2025-02-19T10:00:00.123Z",
  "level": "INFO",
  "message": "API response sent",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "USER#123e4567-****",
  "method": "POST",
  "path": "/games/456/turns/5/votes",
  "statusCode": 201,
  "duration": 123
}
```

### DynamoDB クエリ

#### クエリ開始（INFO）

```json
{
  "timestamp": "2025-02-19T10:00:00.050Z",
  "level": "INFO",
  "message": "DynamoDB query started",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "operation": "Query",
  "tableName": "vote-board-game-table",
  "keyCondition": "PK = :pk AND begins_with(SK, :sk)",
  "params": {
    "PK": "GAME#456e7890-e89b-12d3-a456-426614174001",
    "SK": "CANDIDATE#"
  }
}
```

#### クエリ完了（INFO）

```json
{
  "timestamp": "2025-02-19T10:00:00.100Z",
  "level": "INFO",
  "message": "DynamoDB query completed",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "operation": "Query",
  "tableName": "vote-board-game-table",
  "duration": 50,
  "itemCount": 5,
  "consumedCapacity": {
    "CapacityUnits": 1.0
  }
}
```

### トランザクション

#### トランザクション開始（INFO）

```json
{
  "timestamp": "2025-02-19T10:00:00.050Z",
  "level": "INFO",
  "message": "Transaction started",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "transactionId": "tx-123e4567",
  "operations": [
    {
      "type": "Put",
      "tableName": "vote-board-game-table",
      "key": { "PK": "VOTE#...", "SK": "VOTE#..." }
    },
    {
      "type": "Update",
      "tableName": "vote-board-game-table",
      "key": { "PK": "CANDIDATE#...", "SK": "CANDIDATE#..." }
    }
  ]
}
```

#### トランザクション完了（INFO）

```json
{
  "timestamp": "2025-02-19T10:00:00.150Z",
  "level": "INFO",
  "message": "Transaction completed",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "transactionId": "tx-123e4567",
  "duration": 100,
  "status": "success"
}
```

#### トランザクション失敗（ERROR）

```json
{
  "timestamp": "2025-02-19T10:00:00.150Z",
  "level": "ERROR",
  "message": "Transaction failed",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "transactionId": "tx-123e4567",
  "duration": 100,
  "status": "failed",
  "error": {
    "name": "TransactionCanceledException",
    "message": "Transaction cancelled",
    "code": "TransactionCanceledException",
    "stack": "Error: Transaction cancelled\n    at ..."
  }
}
```

### エラー

#### アプリケーションエラー（ERROR）

```json
{
  "timestamp": "2025-02-19T10:00:00.100Z",
  "level": "ERROR",
  "message": "Validation error",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "USER#123e4567-****",
  "method": "POST",
  "path": "/games/456/turns/5/candidates",
  "error": {
    "name": "ValidationError",
    "message": "Description must be 200 characters or less",
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "description",
      "value": "too long description..."
    }
  }
}
```

#### システムエラー（ERROR）

```json
{
  "timestamp": "2025-02-19T10:00:00.100Z",
  "level": "ERROR",
  "message": "Unexpected error",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "USER#123e4567-****",
  "method": "POST",
  "path": "/games/456/turns/5/votes",
  "error": {
    "name": "Error",
    "message": "Cannot read property 'id' of undefined",
    "stack": "Error: Cannot read property 'id' of undefined\n    at handler (/var/task/index.js:123:45)\n    at ..."
  }
}
```

### バッチ処理

#### バッチ開始（INFO）

```json
{
  "timestamp": "2025-02-20T00:00:00.000Z",
  "level": "INFO",
  "message": "Batch started",
  "requestId": "batch-123e4567",
  "batchType": "vote-aggregation",
  "targetDate": "2025-02-19"
}
```

#### バッチ完了（INFO）

```json
{
  "timestamp": "2025-02-20T00:05:00.000Z",
  "level": "INFO",
  "message": "Batch completed",
  "requestId": "batch-123e4567",
  "batchType": "vote-aggregation",
  "targetDate": "2025-02-19",
  "duration": 300000,
  "processedGames": 10,
  "processedVotes": 150
}
```

#### バッチエラー（ERROR）

```json
{
  "timestamp": "2025-02-20T00:02:30.000Z",
  "level": "ERROR",
  "message": "Batch failed",
  "requestId": "batch-123e4567",
  "batchType": "vote-aggregation",
  "targetDate": "2025-02-19",
  "duration": 150000,
  "processedGames": 5,
  "error": {
    "name": "Error",
    "message": "Failed to aggregate votes for game 456",
    "gameId": "456e7890-e89b-12d3-a456-426614174001",
    "stack": "Error: Failed to aggregate votes\n    at ..."
  }
}
```

### AI 生成

#### AI リクエスト（INFO）

```json
{
  "timestamp": "2025-02-20T00:01:00.000Z",
  "level": "INFO",
  "message": "AI generation started",
  "requestId": "batch-123e4567",
  "aiModel": "amazon.nova-pro-v1:0",
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "prompt": "Generate next move candidates for Othello game..."
}
```

#### AI レスポンス（INFO）

```json
{
  "timestamp": "2025-02-20T00:01:05.000Z",
  "level": "INFO",
  "message": "AI generation completed",
  "requestId": "batch-123e4567",
  "aiModel": "amazon.nova-pro-v1:0",
  "gameId": "456e7890-e89b-12d3-a456-426614174001",
  "turnNumber": 5,
  "duration": 5000,
  "candidatesGenerated": 3,
  "inputTokens": 1500,
  "outputTokens": 800
}
```

## ログライブラリ

### AWS Lambda Powertools for TypeScript

- **@aws-lambda-powertools/logger**: AWS Lambda 用の構造化ロガー
- JSON 形式で出力
- CloudWatch Logs に最適化
- リクエストコンテキストの自動追加
- サンプリング機能（デバッグログの動的有効化）

### 基本設定

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'vote-board-game-api',
  logLevel: process.env.LOG_LEVEL || 'INFO',
});

export const handler = async (event: APIGatewayProxyEvent) => {
  // リクエストIDの自動追加
  logger.addContext({
    requestId: event.requestContext.requestId,
  });

  logger.info('API request received', {
    method: event.httpMethod,
    path: event.path,
  });

  // 処理...

  logger.info('API response sent', {
    statusCode: 200,
    duration: Date.now() - startTime,
  });
};
```

### 機密情報のマスキング

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'vote-board-game-api',
  logLevel: process.env.LOG_LEVEL || 'INFO',
});

// カスタムシリアライザーで機密情報をマスキング
const maskSensitiveData = (data: any) => {
  if (data.password) {
    data.password = '***MASKED***';
  }
  if (data.authorization) {
    data.authorization = 'Bearer ***MASKED***';
  }
  if (data.email) {
    data.email = data.email.replace(/(.{1})(.*)(@.*)/, '$1***$3');
  }
  return data;
};

logger.info('User login', maskSensitiveData({ email: 'user@example.com' }));
```

### エラーログ

```typescript
try {
  // 処理...
} catch (error) {
  logger.error('Unexpected error', {
    error: error as Error,
    context: {
      gameId: '456e7890-e89b-12d3-a456-426614174001',
      turnNumber: 5,
    },
  });
  throw error;
}
```

### 子ロガー（コンテキスト継承）

```typescript
// 親ロガー
const logger = new Logger({
  serviceName: 'vote-board-game-api',
});

// 子ロガー（コンテキストを継承）
const gameLogger = logger.createChild({
  persistentLogAttributes: {
    gameId: '456e7890-e89b-12d3-a456-426614174001',
  },
});

gameLogger.info('Game started'); // gameId が自動的に含まれる
```

## モニタリング・アラート

### CloudWatch Logs Insights クエリ

#### エラー率

```sql
fields @timestamp, level, message, error.name
| filter level = "ERROR"
| stats count() as errorCount by bin(5m)
```

#### レスポンスタイム

```sql
fields @timestamp, duration, path
| filter method = "POST" and path like /games/
| stats avg(duration), max(duration), min(duration) by path
```

#### DynamoDB クエリパフォーマンス

```sql
fields @timestamp, operation, tableName, duration, itemCount
| filter operation = "Query"
| stats avg(duration), max(duration) by tableName
```

### CloudWatch Alarms

- エラー率が 5% を超えた場合
- レスポンスタイムが 3 秒を超えた場合
- DynamoDB クエリが 1 秒を超えた場合
- バッチ処理が失敗した場合

## ログ保持戦略

### CloudWatch Logs 保持期間

- 開発環境: 7 日間
- ステージング環境: 7 日間
- 本番環境: 30 日間

### S3 アーカイブ（MVP 後の拡張）

MVP では CloudWatch Logs のみを使用し、S3 アーカイブは将来的な拡張として検討。

理由:

- MVP の規模では CloudWatch Logs の保持期間（30 日）で十分
- Kinesis Firehose のコスト（$0.035/GB）は小規模では割高
- Lambda + EventBridge によるバッチエクスポートも実装コストが高い
- 必要になった時点で導入を検討

将来的な S3 アーカイブ方式の選択肢:

1. **Kinesis Firehose**（リアルタイム、ログ量が多い場合）
   - コスト: $0.035/GB（us-east-1）
   - メリット: リアルタイム、マネージド
   - デメリット: 小規模では割高
2. **Lambda + EventBridge**（バッチ、ログ量が少ない場合）
   - コスト: Lambda 実行料金のみ
   - メリット: 低コスト
   - デメリット: 実装・運用コスト

## セキュリティ

### ログアクセス制限

- CloudWatch Logs: IAM ロールで制限
- S3 バケット: バケットポリシーで制限
- 本番環境のログは開発者のみアクセス可能

### 暗号化

- CloudWatch Logs: KMS で暗号化
- S3 バケット: SSE-S3 で暗号化

## CDK 実装例

### CloudWatch Logs 保持期間設定

```typescript
import * as logs from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';

// Lambda 関数のロググループ
const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
  logGroupName: `/aws/lambda/vote-board-game-api-${env}`,
  retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
  removalPolicy: RemovalPolicy.DESTROY, // 開発環境では削除可能に
});
```

### Lambda 関数のロガー設定

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import middy from '@middy/core';

const logger = new Logger({
  serviceName: 'vote-board-game-api',
  logLevel: process.env.LOG_LEVEL || 'INFO',
});

const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  logger.info('Processing request', { path: event.path });
  // 処理...
};

// Middy ミドルウェアでリクエストコンテキストを自動追加
export const handler = middy(lambdaHandler).use(injectLambdaContext(logger));
```

## コスト試算（MVP）

### 前提

- Lambda 実行回数: 10,000 回/日
- 平均ログサイズ: 5 KB/実行
- 月間ログ量: 10,000 × 5 KB × 30 日 = 1.5 GB/月

### CloudWatch Logs コスト

- 取り込み: 1.5 GB × $0.50/GB = $0.75/月
- 保存（30 日）: 1.5 GB × $0.03/GB = $0.045/月
- 合計: 約 $0.80/月

### Kinesis Firehose を使った場合（参考）

- Firehose: 1.5 GB × $0.035/GB = $0.053/月
- S3 保存: 1.5 GB × $0.023/GB = $0.035/月
- CloudWatch Logs（7 日）: 約 $0.20/月
- 合計: 約 $0.29/月

結論: MVP では CloudWatch Logs のみで十分。ログ量が増えた場合（10 GB/月以上）に S3 アーカイブを検討。

## 参考

- [AWS Lambda Powertools for TypeScript - Logger](https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/)
- [CloudWatch Logs Pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)
