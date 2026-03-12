# Requirements Document

## Introduction

AWS Bedrock (Nova Pro) 統合機能は、投票ボードゲームアプリケーションにAI機能を提供する基盤となる機能です。この機能により、次の一手候補の生成、対局解説の生成、AIの手の実行が可能になります。Nova Proモデルを使用することで、コスト効率の良いAI機能を実現します。

## Glossary

- **Bedrock_Client**: AWS Bedrock APIと通信するクライアントライブラリ
- **Nova_Pro_Model**: AWS Bedrockで提供されるNova Proモデル（モデルID: `amazon.nova-pro-v1:0`）
- **Prompt_Template**: AIモデルに送信するプロンプトのテンプレート
- **Token_Counter**: APIリクエストで使用されるトークン数を計測するコンポーネント
- **Bedrock_Service**: Bedrock APIを呼び出すビジネスロジック層
- **Lambda_Function**: Bedrock Serviceを実行するAWS Lambda関数
- **IAM_Role**: Lambda関数がBedrockにアクセスするためのIAMロール
- **Retry_Handler**: API呼び出し失敗時のリトライ処理を行うコンポーネント
- **Response_Stream**: Bedrockからのストリーミングレスポンス
- **Model_Parameters**: 温度、top_p、max_tokensなどのモデル設定パラメータ

## Requirements

### Requirement 1: Bedrock Client初期化

**User Story:** As a developer, I want to initialize the Bedrock client, so that the application can communicate with AWS Bedrock API

#### Acceptance Criteria

1. THE Bedrock_Client SHALL be initialized with the AWS region `ap-northeast-1`
2. THE Bedrock_Client SHALL use AWS SDK v3 (@aws-sdk/client-bedrock-runtime)
3. WHEN Lambda_Function starts, THE Bedrock_Client SHALL be initialized once and reused across invocations
4. THE Bedrock_Client SHALL use the Lambda execution role credentials automatically
5. IF Bedrock_Client initialization fails, THEN THE Lambda_Function SHALL log the error and throw an exception

### Requirement 2: Nova Pro Model設定

**User Story:** As a developer, I want to configure the Nova Pro model, so that I can control AI response quality and cost

#### Acceptance Criteria

1. THE Bedrock_Service SHALL use model ID `amazon.nova-pro-v1:0`
2. THE Model_Parameters SHALL include temperature (default: 0.7)
3. THE Model_Parameters SHALL include top_p (default: 0.9)
4. THE Model_Parameters SHALL include max_tokens (default: 2048)
5. WHERE custom parameters are provided, THE Bedrock_Service SHALL override default Model_Parameters
6. THE Model_Parameters SHALL be configurable via environment variables

### Requirement 3: プロンプト送信

**User Story:** As a developer, I want to send prompts to Nova Pro, so that I can generate AI responses

#### Acceptance Criteria

1. WHEN a prompt is provided, THE Bedrock_Service SHALL send it to Nova_Pro_Model
2. THE Bedrock_Service SHALL use the `converse` API for text generation
3. THE Bedrock_Service SHALL include system prompts and user messages in the request
4. THE Bedrock_Service SHALL validate that the prompt is not empty before sending
5. IF the prompt exceeds 100,000 characters, THEN THE Bedrock_Service SHALL return an error
6. THE Bedrock_Service SHALL return the generated text response

### Requirement 4: エラーハンドリング

**User Story:** As a developer, I want robust error handling, so that the application can gracefully handle API failures

#### Acceptance Criteria

1. WHEN Bedrock API returns a throttling error, THE Retry_Handler SHALL retry up to 3 times with exponential backoff
2. WHEN Bedrock API returns a validation error, THE Bedrock_Service SHALL log the error and return a descriptive error message
3. WHEN Bedrock API returns a model not found error, THE Bedrock_Service SHALL log the error and throw an exception
4. WHEN network timeout occurs, THE Retry_Handler SHALL retry up to 2 times
5. IF all retries fail, THEN THE Bedrock_Service SHALL return an error response with the failure reason
6. THE Bedrock_Service SHALL log all errors with request ID and timestamp

### Requirement 5: トークン使用量の監視

**User Story:** As a developer, I want to monitor token usage, so that I can optimize costs

#### Acceptance Criteria

1. WHEN Bedrock API returns a response, THE Token_Counter SHALL extract input token count from the response metadata
2. WHEN Bedrock API returns a response, THE Token_Counter SHALL extract output token count from the response metadata
3. THE Token_Counter SHALL log token usage to CloudWatch Logs
4. THE Token_Counter SHALL include model ID, request ID, and timestamp in the log
5. THE Token_Counter SHALL calculate the total token count (input + output)

### Requirement 6: IAMロールと権限

**User Story:** As a developer, I want proper IAM permissions, so that Lambda can access Bedrock securely

#### Acceptance Criteria

1. THE IAM_Role SHALL grant `bedrock:InvokeModel` permission to Lambda_Function
2. THE IAM_Role SHALL grant `bedrock:InvokeModelWithResponseStream` permission to Lambda_Function
3. THE IAM_Role SHALL restrict access to Nova_Pro_Model only (resource: `arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-pro-v1:0`)
4. THE IAM_Role SHALL be created via AWS CDK
5. THE IAM_Role SHALL follow the principle of least privilege
6. THE IAM_Role SHALL include CloudWatch Logs permissions for logging

### Requirement 7: 環境変数設定

**User Story:** As a developer, I want to configure Bedrock settings via environment variables, so that I can change settings without code changes

#### Acceptance Criteria

1. THE Lambda_Function SHALL read `BEDROCK_MODEL_ID` environment variable (default: `amazon.nova-pro-v1:0`)
2. THE Lambda_Function SHALL read `BEDROCK_REGION` environment variable (default: `ap-northeast-1`)
3. THE Lambda_Function SHALL read `BEDROCK_MAX_TOKENS` environment variable (default: `2048`)
4. THE Lambda_Function SHALL read `BEDROCK_TEMPERATURE` environment variable (default: `0.7`)
5. THE Lambda_Function SHALL read `BEDROCK_TOP_P` environment variable (default: `0.9`)
6. WHERE an environment variable is not set, THE Lambda_Function SHALL use the default value

### Requirement 8: レスポンスストリーミング対応

**User Story:** As a developer, I want to support streaming responses, so that I can provide real-time AI output for future features

#### Acceptance Criteria

1. THE Bedrock_Service SHALL provide a method to invoke the model with streaming enabled
2. WHEN streaming is enabled, THE Bedrock_Service SHALL use `converseStream` API
3. THE Bedrock_Service SHALL process Response_Stream chunks as they arrive
4. THE Bedrock_Service SHALL aggregate streaming chunks into a complete response
5. IF streaming fails mid-response, THEN THE Bedrock_Service SHALL log the error and return a partial response with error flag

### Requirement 9: ユニットテスト

**User Story:** As a developer, I want comprehensive unit tests, so that I can ensure the Bedrock integration works correctly

#### Acceptance Criteria

1. THE test suite SHALL mock Bedrock API responses using Vitest
2. THE test suite SHALL test successful prompt invocation
3. THE test suite SHALL test error handling for throttling errors
4. THE test suite SHALL test error handling for validation errors
5. THE test suite SHALL test retry logic with exponential backoff
6. THE test suite SHALL test token counting functionality
7. THE test suite SHALL test environment variable configuration
8. THE test suite SHALL achieve at least 80% code coverage

### Requirement 10: ロギングとモニタリング

**User Story:** As a developer, I want detailed logging, so that I can debug issues and monitor performance

#### Acceptance Criteria

1. WHEN Bedrock_Service is invoked, THE Lambda_Function SHALL log the request ID and timestamp
2. WHEN Bedrock API call succeeds, THE Lambda_Function SHALL log the response time and token usage
3. WHEN Bedrock API call fails, THE Lambda_Function SHALL log the error type, message, and request ID
4. THE Lambda_Function SHALL log all retries with attempt number
5. THE Lambda_Function SHALL use structured logging (JSON format)
6. THE Lambda_Function SHALL not log sensitive information (prompts may contain user data)

### Requirement 11: CDKによるインフラ定義

**User Story:** As a developer, I want to define Bedrock infrastructure via CDK, so that I can manage infrastructure as code

#### Acceptance Criteria

1. THE CDK stack SHALL create a Lambda function for Bedrock integration
2. THE CDK stack SHALL create an IAM_Role with Bedrock permissions
3. THE CDK stack SHALL set environment variables for the Lambda function
4. THE CDK stack SHALL configure Lambda timeout to 30 seconds
5. THE CDK stack SHALL configure Lambda memory to 512 MB
6. THE CDK stack SHALL add CloudWatch Logs retention policy (30 days)
7. THE CDK stack SHALL pass cdk-nag security checks

### Requirement 12: コスト最適化

**User Story:** As a developer, I want to optimize Bedrock costs, so that the application remains cost-efficient

#### Acceptance Criteria

1. THE Bedrock_Service SHALL use Nova Pro model (lower cost than other models)
2. THE Bedrock_Service SHALL set reasonable max_tokens limits to prevent excessive token usage
3. THE Bedrock_Service SHALL cache Bedrock_Client instances to reduce initialization overhead
4. THE Bedrock_Service SHALL validate input length before sending to avoid unnecessary API calls
5. THE Token_Counter SHALL emit CloudWatch metrics for cost tracking
