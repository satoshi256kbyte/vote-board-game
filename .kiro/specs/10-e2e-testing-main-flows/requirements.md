# Requirements Document: E2E Testing Main Flows

## Introduction

本ドキュメントは、認証フローの主要なハッピーパスをカバーする最小限のE2Eテストの要件を定義する。Playwrightを使用して、ユーザー登録、ログイン、パスワードリセットの3つの基本フローをテストし、CI/CDパイプラインに統合することで、デプロイ前の品質保証を実現する。

## Glossary

- **E2E_Test_Suite**: Playwrightを使用した認証フローのエンドツーエンドテストスイート
- **Test_Runner**: GitHub ActionsまたはローカルでE2Eテストを実行するシステム
- **Test_User**: E2Eテスト用に生成される一時的なテストユーザー
- **Test_Helper**: テストで共通利用するヘルパー関数群
- **CI_Pipeline**: GitHub Actionsによる継続的インテグレーションパイプライン
- **Deployed_App**: CloudFrontにデプロイされたアプリケーション
- **Cognito**: AWS Cognitoによる認証サービス
- **Test_Config**: E2Eテストの設定（URL、タイムアウト、リトライ回数など）

## Requirements

### Requirement 1: ユーザー登録フローのテスト

**User Story:** As a developer, I want to test the user registration flow end-to-end, so that I can ensure users can successfully create accounts.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite executes the registration test THEN the system SHALL navigate to the registration page
2. WHEN the registration page is loaded THEN the E2E_Test_Suite SHALL verify the page title contains "アカウント作成"
3. WHEN the E2E_Test_Suite fills the registration form with valid test user data THEN the system SHALL accept all input fields
4. WHEN the E2E_Test_Suite submits the registration form THEN the Deployed_App SHALL create the user in Cognito
5. WHEN user registration succeeds THEN the Deployed_App SHALL redirect to the home page "/"
6. WHEN the user is redirected after registration THEN the E2E_Test_Suite SHALL verify an access token exists in localStorage
7. WHEN the registration is successful THEN the E2E_Test_Suite SHALL verify no error messages are displayed

### Requirement 2: ログインフローのテスト

**User Story:** As a developer, I want to test the login flow end-to-end, so that I can ensure users can successfully authenticate.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite executes the login test THEN the system SHALL navigate to the login page
2. WHEN the login page is loaded THEN the E2E_Test_Suite SHALL verify the page title contains "ログイン"
3. WHEN the E2E_Test_Suite fills the login form with valid credentials THEN the system SHALL accept the email and password inputs
4. WHEN the E2E_Test_Suite submits the login form THEN the Deployed_App SHALL authenticate the user with Cognito
5. WHEN authentication succeeds THEN the Deployed_App SHALL redirect to the home page "/"
6. WHEN the user is redirected after login THEN the E2E_Test_Suite SHALL verify an access token exists in localStorage
7. WHEN the user is redirected after login THEN the E2E_Test_Suite SHALL verify a refresh token exists in localStorage

### Requirement 3: パスワードリセットフローのテスト

**User Story:** As a developer, I want to test the password reset flow end-to-end, so that I can ensure users can successfully reset their passwords.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite executes the password reset test THEN the system SHALL navigate to the password reset page
2. WHEN the password reset page is loaded THEN the E2E_Test_Suite SHALL verify the page title contains "パスワードリセット"
3. WHEN the E2E_Test_Suite submits an email for password reset THEN the Cognito SHALL send a confirmation code
4. WHEN the confirmation code is sent THEN the E2E_Test_Suite SHALL verify the code input field is visible
5. WHEN the E2E_Test_Suite submits the confirmation code and new password THEN the Cognito SHALL update the user password
6. WHEN the password reset succeeds THEN the E2E_Test_Suite SHALL verify a success message is displayed
7. WHEN the password is reset THEN the E2E_Test_Suite SHALL verify the user can login with the new password
8. WHEN the password is reset THEN the E2E_Test_Suite SHALL verify the old password no longer works

### Requirement 4: テストユーザー管理

**User Story:** As a developer, I want to generate and cleanup test users automatically, so that tests remain isolated and repeatable.

#### Acceptance Criteria

1. WHEN the Test_Helper generates a test user THEN the system SHALL create a unique email address using timestamp
2. WHEN the Test_Helper generates a test user THEN the system SHALL create a password that meets security requirements
3. WHEN the Test_Helper generates a test user THEN the system SHALL create a non-empty username
4. WHEN an E2E test completes THEN the Test_Helper SHALL remove the test user from Cognito
5. WHEN test user cleanup fails THEN the Test_Helper SHALL log the error and continue

### Requirement 5: CI/CDパイプライン統合

**User Story:** As a developer, I want E2E tests to run automatically in CI/CD, so that I can catch issues before deployment.

#### Acceptance Criteria

1. WHEN the deployment job completes successfully THEN the CI_Pipeline SHALL trigger the E2E test job
2. WHEN the E2E test job starts THEN the CI_Pipeline SHALL pass the CloudFront URL to the test runner
3. WHEN the E2E test job runs THEN the Test_Runner SHALL execute all authentication flow tests
4. WHEN any E2E test fails THEN the CI_Pipeline SHALL mark the build as failed
5. WHEN E2E tests fail THEN the Test_Runner SHALL save screenshots and error logs as artifacts
6. WHEN all E2E tests pass THEN the CI_Pipeline SHALL mark the build as successful

### Requirement 6: テスト設定管理

**User Story:** As a developer, I want to configure E2E test behavior, so that I can run tests in different environments.

#### Acceptance Criteria

1. WHEN the Test_Config is loaded THEN the system SHALL validate the base URL is a valid URL format
2. WHEN the Test_Config is loaded THEN the system SHALL validate the timeout is a positive integer
3. WHEN the Test_Config is loaded THEN the system SHALL validate the retries value is zero or greater
4. WHEN running in CI environment THEN the Test_Runner SHALL use headless mode
5. WHEN running locally THEN the Test_Runner SHALL allow headed mode for debugging
6. WHERE the Test_Config specifies a retry count THEN the Test_Runner SHALL retry failed tests up to that count

### Requirement 7: エラーハンドリング

**User Story:** As a developer, I want comprehensive error handling in E2E tests, so that I can diagnose failures quickly.

#### Acceptance Criteria

1. IF the Deployed_App is unreachable THEN the Test_Runner SHALL fail the test with a network error message
2. IF the Cognito service is unavailable THEN the Test_Runner SHALL skip the test with a warning
3. IF a test user already exists in Cognito THEN the Test_Helper SHALL delete the existing user and retry
4. IF a page load times out THEN the Test_Runner SHALL save a screenshot and fail the test
5. IF an assertion fails THEN the Test_Runner SHALL save a screenshot and detailed error message
6. WHEN running in CI environment THEN the Test_Runner SHALL retry failed tests up to 2 times

### Requirement 8: テスト独立性

**User Story:** As a developer, I want each test to be independent, so that test results are reliable and reproducible.

#### Acceptance Criteria

1. WHEN multiple tests run in sequence THEN the E2E_Test_Suite SHALL ensure each test uses a unique test user
2. WHEN a test completes THEN the E2E_Test_Suite SHALL clean up all test data before the next test
3. WHEN a test fails THEN the E2E_Test_Suite SHALL not affect the execution of subsequent tests
4. WHEN tests run in parallel THEN the E2E_Test_Suite SHALL ensure no resource conflicts occur

### Requirement 9: パフォーマンス要件

**User Story:** As a developer, I want E2E tests to complete quickly, so that CI/CD pipelines remain efficient.

#### Acceptance Criteria

1. WHEN an E2E test executes THEN the test SHALL complete within 30 seconds
2. WHEN running in CI environment THEN the Test_Runner SHALL use a single worker to conserve resources
3. WHEN running locally THEN the Test_Runner SHALL allow parallel execution for faster feedback
4. WHEN a test completes THEN the Test_Runner SHALL immediately close the browser to free resources

### Requirement 10: セキュリティ要件

**User Story:** As a developer, I want E2E tests to handle credentials securely, so that sensitive data is not exposed.

#### Acceptance Criteria

1. WHEN the Test_Runner loads test credentials THEN the system SHALL read them from GitHub Secrets or environment variables
2. WHEN a test completes THEN the Test_Helper SHALL delete the test user from Cognito
3. WHEN the Test_Runner saves screenshots THEN the system SHALL ensure passwords are not visible in the images
4. WHEN the Test_Runner logs errors THEN the system SHALL ensure passwords are not included in log messages
5. THE E2E_Test_Suite SHALL NOT execute tests against the production environment
