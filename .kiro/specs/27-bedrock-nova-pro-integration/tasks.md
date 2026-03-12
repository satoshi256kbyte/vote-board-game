# Implementation Plan: AWS Bedrock (Nova Pro) Integration

## Overview

このタスクリストは、AWS Bedrock (Nova Pro) 統合機能の実装を段階的に進めるためのものです。各タスクは前のタスクの成果物を基に構築され、最終的にすべてのコンポーネントが統合されます。

実装は以下の順序で進めます:

1. 基本的な型定義とエラークラス
2. 設定管理とユーティリティ
3. コアサービス層（Client、Service、RetryHandler、TokenCounter）
4. テスト（ユニットテスト、プロパティベーステスト）
5. CDKインフラストラクチャ
6. 統合と検証

## Tasks

- [x] 1. プロジェクト構造とベースファイルのセットアップ
  - `packages/api/src/services/bedrock/` ディレクトリを作成
  - 基本的なファイル構造を準備（index.ts, types.ts, errors.ts）
  - _Requirements: 1.1, 1.2_

- [ ] 2. 型定義とエラークラスの実装
  - [~] 2.1 TypeScript型定義を作成（types.ts）
    - Message, ContentBlock, SystemMessage インターフェースを定義
    - ConverseParams, GenerateTextParams, GenerateTextResponse インターフェースを定義
    - TokenUsageMetrics, BedrockLogEntry インターフェースを定義
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 10.5_

  - [~] 2.2 カスタムエラークラスを実装（errors.ts）
    - BedrockError ベースクラスを実装
    - BedrockValidationError, BedrockModelNotFoundError, BedrockRetryFailedError を実装
    - _Requirements: 4.2, 4.3, 4.5_

  - [~] 2.3 エラークラスのユニットテストを作成（errors.test.ts）
    - 各エラークラスのインスタンス化とプロパティをテスト
    - _Requirements: 9.4_

- [ ] 3. 設定管理の実装
  - [~] 3.1 BedrockConfig インターフェースと loadBedrockConfig 関数を実装（config.ts）
    - 環境変数から設定を読み込む
    - デフォルト値を設定（modelId: amazon.nova-pro-v1:0, region: ap-northeast-1, maxTokens: 2048, temperature: 0.7, topP: 0.9）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [~] 3.2 設定管理のユニットテストを作成（config.test.ts）
    - 環境変数が設定されている場合のテスト
    - 環境変数が未設定の場合のデフォルト値テスト
    - _Requirements: 9.7_

  - [~] 3.3 設定管理のプロパティベーステストを作成（config.property.test.ts）
    - **Property 2: Configuration Loading with Defaults**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
    - _Requirements: 9.7_

- [~] 4. Checkpoint - 基本構造の確認
  - すべてのテストが通ることを確認し、質問があればユーザーに確認する

- [ ] 5. TokenCounter の実装
  - [~] 5.1 TokenCounter クラスを実装（token-counter.ts）
    - recordUsage メソッドを実装（CloudWatch Logs に構造化ログを出力）
    - トークン使用量の計算（inputTokens + outputTokens）
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.5_

  - [~] 5.2 TokenCounter のユニットテストを作成（token-counter.test.ts）
    - recordUsage メソッドのログ出力をテスト
    - ログエントリの構造をテスト（modelId, requestId, timestamp, inputTokens, outputTokens, totalTokens）
    - _Requirements: 9.6_

  - [~] 5.3 TokenCounter のプロパティベーステストを作成（token-counter.property.test.ts）
    - **Property 12: Token Usage Calculation**
    - **Validates: Requirements 5.1, 5.2, 5.5**
    - **Property 13: Token Usage Logging**
    - **Validates: Requirements 5.3, 5.4**
    - _Requirements: 9.6_

- [ ] 6. RetryHandler の実装
  - [~] 6.1 RetryHandler クラスを実装（retry-handler.ts）
    - execute メソッドを実装（リトライロジック付きで関数を実行）
    - isRetryableError メソッドを実装（ThrottlingException, TimeoutError, ServiceUnavailableException を判定）
    - calculateDelay メソッドを実装（エクスポネンシャルバックオフ + ジッター）
    - _Requirements: 4.1, 4.4, 4.5, 10.4_

  - [~] 6.2 RetryHandler のユニットテストを作成（retry-handler.test.ts）
    - リトライ可能なエラーのテスト（ThrottlingException, TimeoutError）
    - リトライ不可能なエラーのテスト（ValidationError）
    - リトライ回数の上限テスト
    - エクスポネンシャルバックオフの計算テスト
    - _Requirements: 9.3, 9.5_

  - [~] 6.3 RetryHandler のプロパティベーステストを作成（retry-handler.property.test.ts）
    - **Property 7: Throttling Error Retry**
    - **Validates: Requirements 4.1**
    - **Property 8: Timeout Error Retry**
    - **Validates: Requirements 4.4**
    - **Property 9: Non-Retryable Error Propagation**
    - **Validates: Requirements 4.2, 4.3**
    - **Property 10: Retry Exhaustion Error**
    - **Validates: Requirements 4.5**
    - **Property 18: Retry Attempt Logging**
    - **Validates: Requirements 10.4, 10.5**
    - _Requirements: 9.3, 9.5_

- [~] 7. Checkpoint - ユーティリティ層の確認
  - すべてのテストが通ることを確認し、質問があればユーザーに確認する

- [ ] 8. BedrockClient の実装
  - [~] 8.1 BedrockClient シングルトンクラスを実装（bedrock-client.ts）
    - AWS SDK v3 (@aws-sdk/client-bedrock-runtime) を使用
    - getInstance メソッドを実装（シングルトンパターン）
    - converse メソッドを実装（ConverseCommand を使用）
    - converseStream メソッドを実装（ConverseStreamCommand を使用）
    - resetInstance メソッドを実装（テスト用）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 8.1, 8.2_

  - [~] 8.2 BedrockClient のユニットテストを作成（bedrock-client.test.ts）
    - シングルトンパターンのテスト（同じインスタンスが返されることを確認）
    - converse メソッドのテスト（モックを使用）
    - converseStream メソッドのテスト（モックを使用）
    - 初期化失敗時のエラーハンドリングテスト
    - _Requirements: 1.5, 9.2_

  - [~] 8.3 BedrockClient のプロパティベーステストを作成（bedrock-client.property.test.ts）
    - **Property 1: Singleton Client Reuse**
    - **Validates: Requirements 1.3**
    - _Requirements: 9.2_

- [ ] 9. BedrockService の実装
  - [~] 9.1 BedrockService クラスを実装（bedrock-service.ts）
    - コンストラクタを実装（BedrockClient, RetryHandler, TokenCounter, BedrockConfig を注入）
    - generateText メソッドを実装（プロンプトバリデーション、API呼び出し、トークンカウント、ロギング）
    - generateTextStream メソッドを実装（ストリーミングレスポンス処理）
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 4.6, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.6_

  - [~] 9.2 BedrockService のユニットテストを作成（bedrock-service.test.ts）
    - generateText の成功ケーステスト
    - 空のプロンプトのバリデーションエラーテスト
    - プロンプト長制限（100,000文字）のテスト
    - エラーハンドリングのテスト（ThrottlingException, ValidationError, ModelNotFoundError）
    - トークンカウントの呼び出しテスト
    - ロギングのテスト（リクエストID、タイムスタンプ、レスポンスタイム）
    - generateTextStream のテスト（チャンク集約、エラーハンドリング）
    - _Requirements: 9.2, 9.3, 9.4, 9.6, 9.8_

  - [~] 9.3 BedrockService のプロパティベーステストを作成（bedrock-service.property.test.ts）
    - **Property 3: Parameter Override Precedence**
    - **Validates: Requirements 2.5**
    - **Property 4: Empty Prompt Rejection**
    - **Validates: Requirements 3.4**
    - **Property 5: API Request Structure**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - **Property 6: Response Text Extraction**
    - **Validates: Requirements 3.6**
    - **Property 11: Error Logging Structure**
    - **Validates: Requirements 4.6, 10.3, 10.5**
    - **Property 14: Streaming Chunk Aggregation**
    - **Validates: Requirements 8.2, 8.3, 8.4**
    - **Property 15: Streaming Error Handling**
    - **Validates: Requirements 8.5**
    - **Property 16: Request Invocation Logging**
    - **Validates: Requirements 10.1, 10.5**
    - **Property 17: Success Response Logging**
    - **Validates: Requirements 10.2, 10.5**
    - **Property 19: Sensitive Data Exclusion**
    - **Validates: Requirements 10.6**
    - _Requirements: 9.2, 9.3, 9.4, 9.6_

- [~] 10. Checkpoint - コアサービス層の確認
  - すべてのテストが通ることを確認し、質問があればユーザーに確認する

- [ ] 11. パブリックAPIのエクスポート
  - [~] 11.1 index.ts でパブリックAPIをエクスポート
    - BedrockClient, BedrockService, RetryHandler, TokenCounter をエクスポート
    - loadBedrockConfig, BedrockConfig をエクスポート
    - エラークラス（BedrockError, BedrockValidationError, BedrockModelNotFoundError, BedrockRetryFailedError）をエクスポート
    - 型定義（GenerateTextParams, GenerateTextResponse, GenerateTextStreamResponse）をエクスポート
    - _Requirements: 1.1, 1.2_

- [ ] 12. CDKインフラストラクチャの更新
  - [~] 12.1 Batch Lambda に Bedrock IAM 権限を追加
    - bedrock:InvokeModel 権限を追加
    - bedrock:InvokeModelWithResponseStream 権限を追加
    - リソースを Nova Pro モデル ARN に制限（arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-pro-v1:0）
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [~] 12.2 Batch Lambda に環境変数を追加
    - BEDROCK_MODEL_ID: amazon.nova-pro-v1:0
    - BEDROCK_REGION: ap-northeast-1
    - BEDROCK_MAX_TOKENS: 2048
    - BEDROCK_TEMPERATURE: 0.7
    - BEDROCK_TOP_P: 0.9
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [~] 12.3 Lambda 設定を更新
    - タイムアウトを 30 秒に設定
    - メモリを 512 MB に設定
    - CloudWatch Logs 保持期間を 30 日に設定
    - _Requirements: 11.4, 11.5, 11.6_

  - [~] 12.4 CDK テストを作成（packages/infra/test/bedrock-infrastructure.test.ts）
    - IAM 権限のテスト（bedrock:InvokeModel, bedrock:InvokeModelWithResponseStream）
    - 環境変数のテスト
    - Lambda 設定のテスト（タイムアウト、メモリ）
    - CloudWatch Logs 保持期間のテスト
    - _Requirements: 11.1, 11.2, 11.3, 11.7_

- [ ] 13. 依存関係の追加
  - [~] 13.1 packages/api/package.json に @aws-sdk/client-bedrock-runtime を追加
    - バージョン: ^3.716.0
    - pnpm install を実行
    - _Requirements: 1.2_

- [ ] 14. 統合と検証
  - [~] 14.1 Batch Lambda で BedrockService を使用する例を実装
    - BedrockClient, BedrockService, RetryHandler, TokenCounter を初期化
    - generateText メソッドを呼び出してテスト
    - ログ出力を確認
    - _Requirements: 1.3, 3.1, 3.6, 10.1, 10.2_

  - [~] 14.2 統合テストを作成（bedrock-integration.test.ts）
    - BedrockService の初期化から API 呼び出しまでの E2E テスト
    - エラーハンドリングの統合テスト
    - トークンカウントとロギングの統合テスト
    - _Requirements: 9.8_

- [~] 15. Final Checkpoint - すべてのテストとビルドの確認
  - すべてのユニットテストが通ることを確認
  - すべてのプロパティベーステストが通ることを確認
  - CDK テストが通ることを確認
  - cdk-nag チェックが通ることを確認
  - 質問があればユーザーに確認する

## Notes

- `*` が付いているタスクはオプションで、MVP を早く進めたい場合はスキップ可能です
- 各タスクは特定の要件を参照しており、トレーサビリティを確保しています
- Checkpoint タスクは段階的な検証を行い、問題を早期に発見します
- プロパティベーステストは fast-check を使用し、numRuns は 10-20 に制限します（JSDOM 環境での不安定性を回避）
- すべてのテストは Vitest を使用し、AWS SDK のモックには vi.mock を使用します
- CDK インフラストラクチャの変更は cdk-nag チェックを通過する必要があります
