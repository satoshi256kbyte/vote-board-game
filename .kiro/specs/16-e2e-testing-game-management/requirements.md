# Requirements Document: E2E Testing Game Management

## Introduction

本ドキュメントは、対局管理機能の主要なハッピーパスをカバーする最小限のE2Eテストの要件を定義する。Playwrightを使用して、対局一覧表示、対局詳細表示（盤面・棋譜）、対局作成の3つの基本フローをテストし、CI/CDパイプラインに統合することで、デプロイ前の品質保証を実現する。既存の認証E2Eテストインフラ（spec 10）を活用し、対局管理機能特有のテストを追加する。

## Glossary

- **E2E_Test_Suite**: Playwrightを使用した対局管理機能のエンドツーエンドテストスイート
- **Test_Runner**: GitHub ActionsまたはローカルでE2Eテストを実行するシステム
- **Test_Game**: E2Eテスト用に生成される一時的なテスト対局
- **Game_List_Page**: 対局一覧を表示するページオブジェクト
- **Game_Detail_Page**: 対局詳細を表示するページオブジェクト
- **Game_Create_Page**: 対局作成フォームを表示するページオブジェクト
- **Test_Helper**: テストで共通利用するヘルパー関数群
- **CI_Pipeline**: GitHub Actionsによる継続的インテグレーションパイプライン
- **Deployed_App**: CloudFrontにデプロイされたアプリケーション
- **Game_API**: Lambda + Honoによる対局管理API
- **DynamoDB**: 対局データを保存するデータベース
- **Board_Component**: オセロの盤面を表示するReactコンポーネント
- **Move_History**: 手履歴を表示するコンポーネント

## Requirements

### Requirement 1: 対局一覧画面の表示テスト

**User Story:** As a developer, I want to test the game list display, so that I can ensure users can view and browse available games.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite executes the game list test THEN the system SHALL navigate to the home page "/"
2. WHEN the home page is loaded THEN the E2E_Test_Suite SHALL verify the page title contains "対局一覧"
3. WHEN games exist in the database THEN the E2E_Test_Suite SHALL verify game cards are displayed
4. WHEN a game card is displayed THEN the E2E_Test_Suite SHALL verify it contains game title
5. WHEN a game card is displayed THEN the E2E_Test_Suite SHALL verify it contains game type (オセロ)
6. WHEN a game card is displayed THEN the E2E_Test_Suite SHALL verify it contains current turn number
7. WHEN a game card is displayed THEN the E2E_Test_Suite SHALL verify it contains participant count
8. WHEN a game card is displayed THEN the E2E_Test_Suite SHALL verify it contains voting deadline
9. WHEN the user clicks the "進行中" tab THEN the E2E_Test_Suite SHALL verify only active games are displayed
10. WHEN the user clicks the "終了" tab THEN the E2E_Test_Suite SHALL verify only finished games are displayed
11. WHEN a game card is clicked THEN the E2E_Test_Suite SHALL verify navigation to the game detail page
12. WHEN no games exist THEN the E2E_Test_Suite SHALL verify "対局がありません" message is displayed

### Requirement 2: 対局詳細画面の表示テスト

**User Story:** As a developer, I want to test the game detail display, so that I can ensure users can view the board state and move history correctly.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite executes the game detail test THEN the system SHALL navigate to "/games/[gameId]"
2. WHEN the game detail page is loaded THEN the E2E_Test_Suite SHALL verify the page title contains "オセロ対局"
3. WHEN the game detail page is loaded THEN the E2E_Test_Suite SHALL verify the Board_Component is displayed
4. WHEN the Board_Component is displayed THEN the E2E_Test_Suite SHALL verify it contains exactly 64 cells (8x8 grid)
5. WHEN the Board_Component is displayed THEN the E2E_Test_Suite SHALL verify disc counts for black and white are shown
6. WHEN the Board_Component is displayed THEN the E2E_Test_Suite SHALL verify the current player turn is displayed
7. WHEN the game detail page is loaded THEN the E2E_Test_Suite SHALL verify the Move_History component is displayed
8. WHEN the Move_History is displayed THEN the E2E_Test_Suite SHALL verify moves are shown in chronological order
9. WHEN a move is displayed THEN the E2E_Test_Suite SHALL verify it contains turn number
10. WHEN a move is displayed THEN the E2E_Test_Suite SHALL verify it contains player color (black/white)
11. WHEN a move is displayed THEN the E2E_Test_Suite SHALL verify it contains move position (e.g., "D3")
12. WHEN the game detail page is loaded THEN the E2E_Test_Suite SHALL verify the share button is visible
13. WHEN the game detail page is loaded THEN the E2E_Test_Suite SHALL verify the post candidate button is visible
14. WHEN the game does not exist THEN the E2E_Test_Suite SHALL verify a 404 error message is displayed

### Requirement 3: 盤面状態の検証テスト

**User Story:** As a developer, I want to verify the board state is correctly displayed, so that I can ensure the game logic is working properly.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite verifies board state THEN the system SHALL compare the displayed board with the API response
2. WHEN the board state matches THEN the E2E_Test_Suite SHALL pass the test
3. WHEN the board state does not match THEN the E2E_Test_Suite SHALL fail the test with detailed error message
4. WHEN verifying disc counts THEN the E2E_Test_Suite SHALL count black discs on the board
5. WHEN verifying disc counts THEN the E2E_Test_Suite SHALL count white discs on the board
6. WHEN disc counts are verified THEN the E2E_Test_Suite SHALL compare with the displayed counts
7. WHEN the initial Othello board is displayed THEN the E2E_Test_Suite SHALL verify 2 black discs and 2 white discs

### Requirement 4: 対局作成フローのテスト

**User Story:** As a developer, I want to test the game creation flow, so that I can ensure users can successfully create new games.

#### Acceptance Criteria

1. WHEN the E2E_Test_Suite executes the game creation test THEN the system SHALL verify user is authenticated
2. WHEN the user is authenticated THEN the E2E_Test_Suite SHALL navigate to "/games/new"
3. WHEN the game creation page is loaded THEN the E2E_Test_Suite SHALL verify the page title contains "新規対局作成"
4. WHEN the game creation page is loaded THEN the E2E_Test_Suite SHALL verify game type selection is displayed
5. WHEN the game creation page is loaded THEN the E2E_Test_Suite SHALL verify game mode selection is displayed
6. WHEN the game creation page is loaded THEN the E2E_Test_Suite SHALL verify first player selection is displayed
7. WHEN the user selects game type "オセロ" THEN the E2E_Test_Suite SHALL verify the selection is highlighted
8. WHEN the user selects game mode "AI vs 集合知" THEN the E2E_Test_Suite SHALL verify the selection is highlighted
9. WHEN the user selects first player "AI" THEN the E2E_Test_Suite SHALL verify the selection is highlighted
10. WHEN the user clicks the create button THEN the E2E_Test_Suite SHALL verify a POST request is sent to Game_API
11. WHEN game creation succeeds THEN the E2E_Test_Suite SHALL verify redirect to the game detail page
12. WHEN redirected to game detail THEN the E2E_Test_Suite SHALL verify the new game is displayed
13. WHEN redirected to game detail THEN the E2E_Test_Suite SHALL verify the initial board state is correct
14. WHEN game creation fails THEN the E2E_Test_Suite SHALL verify an error message is displayed

### Requirement 5: ページオブジェクトパターンの実装

**User Story:** As a developer, I want to use page objects, so that I can maintain test code easily.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL implement Game_List_Page object for game list interactions
2. THE E2E_Test_Suite SHALL implement Game_Detail_Page object for game detail interactions
3. THE E2E_Test_Suite SHALL implement Game_Create_Page object for game creation interactions
4. THE Game_List_Page SHALL provide methods for navigating to the page
5. THE Game_List_Page SHALL provide methods for getting game cards
6. THE Game_List_Page SHALL provide methods for clicking game cards
7. THE Game_List_Page SHALL provide methods for selecting tabs
8. THE Game_Detail_Page SHALL provide methods for getting board state
9. THE Game_Detail_Page SHALL provide methods for getting move history
10. THE Game_Detail_Page SHALL provide methods for getting disc counts
11. THE Game_Create_Page SHALL provide methods for selecting game options
12. THE Game_Create_Page SHALL provide methods for submitting the form

### Requirement 6: テストヘルパー関数の実装

**User Story:** As a developer, I want test helper functions, so that I can reuse common test logic.

#### Acceptance Criteria

1. THE Test_Helper SHALL provide a function to create test games
2. THE Test_Helper SHALL provide a function to cleanup test games
3. THE Test_Helper SHALL provide a function to login as test user
4. THE Test_Helper SHALL provide a function to wait for API responses
5. THE Test_Helper SHALL provide a function to verify board state
6. WHEN creating a test game THEN the Test_Helper SHALL add "[TEST]" prefix to the title
7. WHEN creating a test game THEN the Test_Helper SHALL include timestamp in the title
8. WHEN cleaning up a test game THEN the Test_Helper SHALL delete the game from DynamoDB
9. WHEN cleanup fails THEN the Test_Helper SHALL log the error and continue

### Requirement 7: レスポンシブデザインのテスト

**User Story:** As a developer, I want to test responsive design, so that I can ensure the app works on different screen sizes.

#### Acceptance Criteria

1. WHEN testing on desktop viewport THEN the E2E_Test_Suite SHALL verify game list uses grid layout
2. WHEN testing on mobile viewport THEN the E2E_Test_Suite SHALL verify game list uses single column layout
3. WHEN testing on desktop viewport THEN the E2E_Test_Suite SHALL verify game detail uses two-column layout
4. WHEN testing on mobile viewport THEN the E2E_Test_Suite SHALL verify game detail uses single-column layout
5. WHEN testing on desktop viewport THEN the E2E_Test_Suite SHALL verify board cell size is 40px
6. WHEN testing on mobile viewport THEN the E2E_Test_Suite SHALL verify board cell size is 30px
7. THE E2E_Test_Suite SHALL test at least two viewport sizes (desktop: 1280x720, mobile: 375x667)

### Requirement 8: エラーハンドリングのテスト

**User Story:** As a developer, I want to test error handling, so that I can ensure users see appropriate error messages.

#### Acceptance Criteria

1. WHEN the Game_API is unavailable THEN the E2E_Test_Suite SHALL verify an error message is displayed
2. WHEN a network error occurs THEN the E2E_Test_Suite SHALL verify "ネットワークエラーが発生しました" is displayed
3. WHEN a game is not found THEN the E2E_Test_Suite SHALL verify "対局が見つかりません" is displayed
4. WHEN game creation fails THEN the E2E_Test_Suite SHALL verify a user-friendly error message is displayed
5. WHEN an authentication error occurs THEN the E2E_Test_Suite SHALL verify redirect to login page
6. THE E2E_Test_Suite SHALL log errors to the console for debugging
7. THE E2E_Test_Suite SHALL save screenshots when errors occur

### Requirement 9: CI/CDパイプライン統合

**User Story:** As a developer, I want E2E tests to run automatically in CI/CD, so that I can catch issues before deployment.

#### Acceptance Criteria

1. WHEN the deployment job completes successfully THEN the CI_Pipeline SHALL trigger the game E2E test job
2. WHEN the game E2E test job starts THEN the CI_Pipeline SHALL pass the CloudFront URL to the test runner
3. WHEN the game E2E test job runs THEN the Test_Runner SHALL execute all game management flow tests
4. WHEN any game E2E test fails THEN the CI_Pipeline SHALL mark the build as failed
5. WHEN game E2E tests fail THEN the Test_Runner SHALL save screenshots and error logs as artifacts
6. WHEN all game E2E tests pass THEN the CI_Pipeline SHALL mark the build as successful
7. THE CI_Pipeline SHALL run game E2E tests only after authentication E2E tests pass

### Requirement 10: テスト設定管理

**User Story:** As a developer, I want to configure E2E test behavior, so that I can run tests in different environments.

#### Acceptance Criteria

1. WHEN the Test_Config is loaded THEN the system SHALL validate the base URL is a valid URL format
2. WHEN the Test_Config is loaded THEN the system SHALL validate the timeout is a positive integer
3. WHEN the Test_Config is loaded THEN the system SHALL validate the retries value is zero or greater
4. WHEN running in CI environment THEN the Test_Runner SHALL use headless mode
5. WHEN running locally THEN the Test_Runner SHALL allow headed mode for debugging
6. WHERE the Test_Config specifies a retry count THEN the Test_Runner SHALL retry failed tests up to that count
7. THE Test_Config SHALL include test user credentials from environment variables

### Requirement 11: テスト独立性

**User Story:** As a developer, I want each test to be independent, so that test results are reliable and reproducible.

#### Acceptance Criteria

1. WHEN multiple tests run in sequence THEN the E2E_Test_Suite SHALL ensure each test uses a unique test game
2. WHEN a test completes THEN the E2E_Test_Suite SHALL clean up all test data before the next test
3. WHEN a test fails THEN the E2E_Test_Suite SHALL not affect the execution of subsequent tests
4. WHEN tests run in parallel THEN the E2E_Test_Suite SHALL ensure no resource conflicts occur
5. WHEN a test creates a game THEN the E2E_Test_Suite SHALL delete it after the test completes
6. THE E2E_Test_Suite SHALL use unique identifiers for test games to avoid conflicts

### Requirement 12: パフォーマンス要件

**User Story:** As a developer, I want E2E tests to complete quickly, so that CI/CD pipelines remain efficient.

#### Acceptance Criteria

1. WHEN a game E2E test executes THEN the test SHALL complete within 30 seconds
2. WHEN running in CI environment THEN the Test_Runner SHALL use a single worker to conserve resources
3. WHEN running locally THEN the Test_Runner SHALL allow parallel execution for faster feedback
4. WHEN a test completes THEN the Test_Runner SHALL immediately close the browser to free resources
5. THE E2E_Test_Suite SHALL minimize unnecessary waits and use efficient selectors

### Requirement 13: アクセシビリティのテスト

**User Story:** As a developer, I want to test accessibility, so that I can ensure the app is usable by everyone.

#### Acceptance Criteria

1. WHEN testing the Board_Component THEN the E2E_Test_Suite SHALL verify ARIA labels are present
2. WHEN testing interactive elements THEN the E2E_Test_Suite SHALL verify keyboard navigation works
3. WHEN testing interactive elements THEN the E2E_Test_Suite SHALL verify focus indicators are visible
4. WHEN testing forms THEN the E2E_Test_Suite SHALL verify proper label associations
5. WHEN testing error messages THEN the E2E_Test_Suite SHALL verify they are announced to screen readers
6. THE E2E_Test_Suite SHALL use Playwright's accessibility testing features where applicable

### Requirement 14: ローディング状態のテスト

**User Story:** As a developer, I want to test loading states, so that I can ensure users see appropriate feedback.

#### Acceptance Criteria

1. WHEN fetching games THEN the E2E_Test_Suite SHALL verify a skeleton loader is displayed
2. WHEN fetching game details THEN the E2E_Test_Suite SHALL verify a loading spinner is displayed
3. WHEN submitting a form THEN the E2E_Test_Suite SHALL verify the submit button is disabled
4. WHEN submitting a form THEN the E2E_Test_Suite SHALL verify a loading indicator is shown on the button
5. WHEN data loads THEN the E2E_Test_Suite SHALL verify loading indicators are removed

### Requirement 15: セキュリティ要件

**User Story:** As a developer, I want E2E tests to handle credentials securely, so that sensitive data is not exposed.

#### Acceptance Criteria

1. WHEN the Test_Runner loads test credentials THEN the system SHALL read them from GitHub Secrets or environment variables
2. WHEN a test completes THEN the Test_Helper SHALL delete the test game from DynamoDB
3. WHEN the Test_Runner saves screenshots THEN the system SHALL ensure passwords are not visible in the images
4. WHEN the Test_Runner logs errors THEN the system SHALL ensure passwords are not included in log messages
5. THE E2E_Test_Suite SHALL NOT execute tests against the production environment
6. THE E2E_Test_Suite SHALL use test-specific user accounts, not production user accounts

### Requirement 16: テストデータ管理

**User Story:** As a developer, I want to manage test data properly, so that tests remain isolated and clean.

#### Acceptance Criteria

1. WHEN creating a test game THEN the Test_Helper SHALL add "[TEST]" prefix to identify it
2. WHEN creating a test game THEN the Test_Helper SHALL include timestamp for uniqueness
3. WHEN creating a test game THEN the Test_Helper SHALL set initial Othello board state
4. WHEN a test completes THEN the Test_Helper SHALL delete the test game from DynamoDB
5. WHEN cleanup fails THEN the Test_Helper SHALL log the error but not fail the test
6. THE Test_Helper SHALL provide a function to cleanup all test games older than 24 hours

### Requirement 17: 最小限のテスト範囲

**User Story:** As a developer, I want to test only the main flows, so that E2E tests remain fast and maintainable.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL test game list display (main flow only)
2. THE E2E_Test_Suite SHALL test game detail display with board and move history (main flow only)
3. THE E2E_Test_Suite SHALL test game creation flow (main flow only)
4. THE E2E_Test_Suite SHALL NOT test candidate posting flow (covered in separate spec)
5. THE E2E_Test_Suite SHALL NOT test voting flow (covered in separate spec)
6. THE E2E_Test_Suite SHALL NOT test all edge cases (covered in unit tests)
7. THE E2E_Test_Suite SHALL focus on happy paths only

### Requirement 18: 既存インフラの活用

**User Story:** As a developer, I want to reuse existing E2E test infrastructure, so that I can avoid duplication.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL reuse authentication helpers from spec 10
2. THE E2E_Test_Suite SHALL reuse Playwright configuration from spec 10
3. THE E2E_Test_Suite SHALL reuse CI/CD workflow patterns from spec 10
4. THE E2E_Test_Suite SHALL reuse test user management from spec 10
5. THE E2E_Test_Suite SHALL follow the same file structure as spec 10
6. THE E2E_Test_Suite SHALL use the same test reporting format as spec 10

### Requirement 19: テストレポート

**User Story:** As a developer, I want detailed test reports, so that I can diagnose failures quickly.

#### Acceptance Criteria

1. WHEN tests complete THEN the Test_Runner SHALL generate a Playwright HTML report
2. WHEN tests fail THEN the Test_Runner SHALL include screenshots in the report
3. WHEN tests fail THEN the Test_Runner SHALL include error stack traces in the report
4. WHEN tests fail THEN the Test_Runner SHALL include network logs in the report
5. WHEN running in CI THEN the Test_Runner SHALL upload reports as GitHub Actions artifacts
6. THE Test_Runner SHALL retain test reports for 30 days

### Requirement 20: テストの保守性

**User Story:** As a developer, I want maintainable test code, so that I can update tests easily.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL use TypeScript strict mode
2. THE E2E_Test_Suite SHALL define types for all page objects
3. THE E2E_Test_Suite SHALL use data-testid attributes for selectors
4. THE E2E_Test_Suite SHALL avoid using CSS selectors that depend on styling
5. THE E2E_Test_Suite SHALL use descriptive test names
6. THE E2E_Test_Suite SHALL include comments for complex test logic
7. THE E2E_Test_Suite SHALL follow the same coding standards as the main application
