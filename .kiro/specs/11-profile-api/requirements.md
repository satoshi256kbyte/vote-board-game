# Requirements Document

## Introduction

このドキュメントは、投票ボードゲームアプリケーションにおけるプロフィール関連APIの要件を定義します。ユーザーは自分のプロフィール情報（ユーザー名、アイコン画像）を取得・更新できる必要があります。これらのAPIは、AWS Lambda + Hono で実装され、Amazon DynamoDB にデータを保存し、Amazon Cognito の JWT トークンで認証を行います。

## Glossary

- **Profile_API**: ユーザーのプロフィール情報を管理するAPIシステム
- **User**: 投票ボードゲームアプリケーションの登録ユーザー
- **JWT_Token**: Amazon Cognito が発行する認証トークン
- **DynamoDB**: ユーザープロフィールデータを保存するデータベース
- **S3_Bucket**: ユーザーのアイコン画像を保存するストレージ
- **Icon_Image**: ユーザーのプロフィールアイコン画像（PNG、JPEG、GIF形式）
- **Presigned_URL**: S3への一時的なアップロード権限を持つURL

## Requirements

### Requirement 1: プロフィール情報の取得

**User Story:** As a User, I want to retrieve my profile information, so that I can view my current username and icon URL

#### Acceptance Criteria

1. WHEN a valid JWT_Token is provided in the Authorization header, THE Profile_API SHALL return the User's profile information including userId, email, username, iconUrl, createdAt, and updatedAt
2. WHEN the JWT_Token is missing, THE Profile_API SHALL return a 401 Unauthorized error
3. WHEN the JWT_Token is invalid or expired, THE Profile_API SHALL return a 401 Unauthorized error
4. WHEN the User does not exist in DynamoDB, THE Profile_API SHALL return a 404 Not Found error
5. THE Profile_API SHALL respond within 500 milliseconds for profile retrieval requests

### Requirement 2: プロフィール情報の更新

**User Story:** As a User, I want to update my username and icon URL, so that I can personalize my profile

#### Acceptance Criteria

1. WHEN a valid JWT_Token is provided and valid update data is submitted, THE Profile_API SHALL update the User's profile in DynamoDB and return the updated profile information
2. WHEN the username field is provided, THE Profile_API SHALL validate that the username is between 1 and 50 characters
3. WHEN the iconUrl field is provided, THE Profile_API SHALL validate that the iconUrl is a valid HTTPS URL
4. IF the username contains invalid characters, THEN THE Profile_API SHALL return a 400 Validation Error with details about the invalid characters
5. WHEN the JWT_Token is missing or invalid, THE Profile_API SHALL return a 401 Unauthorized error
6. WHEN the User attempts to update another User's profile, THE Profile_API SHALL return a 403 Forbidden error
7. THE Profile_API SHALL update the updatedAt timestamp to the current ISO 8601 datetime when any field is modified
8. WHEN no fields are provided in the update request, THE Profile_API SHALL return a 400 Validation Error indicating that at least one field must be provided

### Requirement 3: アイコン画像のアップロード準備

**User Story:** As a User, I want to upload an icon image, so that I can display a custom avatar on my profile

#### Acceptance Criteria

1. WHEN a valid JWT_Token is provided with a valid file extension, THE Profile_API SHALL generate a Presigned_URL for uploading to S3_Bucket
2. THE Profile_API SHALL validate that the file extension is one of: png, jpg, jpeg, or gif
3. IF the file extension is not supported, THEN THE Profile_API SHALL return a 400 Validation Error with a list of supported formats
4. THE Profile_API SHALL generate a unique filename using the pattern: `icons/<userId>/<timestamp>.<extension>`
5. THE Profile_API SHALL set the Presigned_URL expiration time to 5 minutes
6. THE Profile_API SHALL configure the Presigned_URL to accept only the specified Content-Type based on the file extension
7. THE Profile_API SHALL return both the Presigned_URL for upload and the final iconUrl that will be accessible after upload
8. WHEN the JWT_Token is missing or invalid, THE Profile_API SHALL return a 401 Unauthorized error
9. THE Profile_API SHALL set a maximum file size limit of 5 MB for the upload

### Requirement 4: データの整合性

**User Story:** As a System Administrator, I want to ensure data consistency, so that profile data remains accurate and reliable

#### Acceptance Criteria

1. WHEN a profile update operation fails, THE Profile_API SHALL not modify any User data in DynamoDB
2. THE Profile_API SHALL use DynamoDB conditional updates to prevent race conditions when multiple update requests occur simultaneously
3. WHEN a User's iconUrl is updated, THE Profile_API SHALL preserve the previous iconUrl value in the database until the new upload is confirmed
4. THE Profile_API SHALL validate that the userId from the JWT_Token matches the userId in the database before performing any update operation

### Requirement 5: エラーハンドリングとロギング

**User Story:** As a Developer, I want comprehensive error handling and logging, so that I can troubleshoot issues effectively

#### Acceptance Criteria

1. WHEN any error occurs, THE Profile_API SHALL return a standardized error response with error code, message, and details fields
2. THE Profile_API SHALL log all API requests including userId, endpoint, method, and timestamp to CloudWatch
3. WHEN a validation error occurs, THE Profile_API SHALL include specific field-level error details in the response
4. WHEN a DynamoDB operation fails, THE Profile_API SHALL log the error details and return a 500 Internal Server Error to the client
5. THE Profile_API SHALL not expose sensitive information such as database connection strings or internal system details in error responses

### Requirement 6: セキュリティとアクセス制御

**User Story:** As a Security Administrator, I want strict access controls, so that users can only access and modify their own profile data

#### Acceptance Criteria

1. THE Profile_API SHALL require a valid JWT_Token for all profile operations
2. THE Profile_API SHALL extract the userId from the JWT_Token and use it to identify the User
3. THE Profile_API SHALL reject any request where the JWT_Token's userId does not match the requested profile's userId
4. THE Profile_API SHALL validate the JWT_Token signature using Amazon Cognito's public keys
5. WHEN the S3_Bucket Presigned_URL is generated, THE Profile_API SHALL restrict upload permissions to the specific object key only
6. THE Profile_API SHALL set appropriate CORS headers to allow requests only from authorized frontend domains

### Requirement 7: パフォーマンスとスケーラビリティ

**User Story:** As a System Architect, I want the API to perform efficiently, so that it can handle high traffic volumes

#### Acceptance Criteria

1. THE Profile_API SHALL use DynamoDB's GetItem operation for profile retrieval to ensure consistent low latency
2. THE Profile_API SHALL use DynamoDB's UpdateItem operation with conditional expressions for profile updates
3. WHEN generating Presigned_URLs, THE Profile_API SHALL complete the operation within 200 milliseconds
4. THE Profile_API SHALL implement connection pooling for DynamoDB client to optimize resource usage
5. THE Profile_API SHALL be stateless to enable horizontal scaling across multiple Lambda instances
