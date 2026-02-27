# Requirements Document

## Introduction

対局周りの画面・コンポーネントは、投票ボードゲームアプリケーションのフロントエンド実装の中核機能です。ユーザーが対局を閲覧、作成、参加し、次の一手候補に投票するための画面とコンポーネントを提供します。既存のGame API（spec 14）とOthelloゲームロジック（spec 13）を活用し、Next.js 16のApp RouterとReact 19のServer/Client Componentsを使用して、高速でアクセシブルなユーザー体験を実現します。

## Glossary

- **Game_List_Screen**: 対局一覧を表示するトップページ画面
- **Game_Create_Screen**: 新規対局を作成する画面
- **Game_Detail_Screen**: 対局の詳細情報と盤面を表示する画面
- **Candidate_Post_Screen**: 次の一手候補を投稿する画面
- **Candidate_Detail_Screen**: 候補の詳細情報を表示する画面
- **Board_Component**: オセロの盤面を表示するコンポーネント
- **Game_Card_Component**: 対局のサマリー情報を表示するカードコンポーネント
- **Candidate_Card_Component**: 次の一手候補を表示するカードコンポーネント
- **Move_History_Component**: 手履歴を表示するコンポーネント
- **Server_Component**: サーバー側でレンダリングされるReactコンポーネント
- **Client_Component**: クライアント側でレンダリングされるReactコンポーネント
- **Game_API**: ゲーム管理のためのRESTful APIエンドポイント群（spec 14）

## Requirements

### Requirement 1: 対局一覧画面（トップページ）

**User Story:** As a user, I want to view a list of games, so that I can browse and select a game to participate in.

#### Acceptance Criteria

1. THE Game_List_Screen SHALL display at URL path `/`
2. THE Game_List_Screen SHALL fetch games from Game_API GET /api/games endpoint
3. THE Game_List_Screen SHALL display games in a grid layout on desktop
4. THE Game_List_Screen SHALL display games in a single column layout on mobile
5. THE Game_List_Screen SHALL show tabs for filtering by status (進行中/終了)
6. WHEN the 進行中 tab is selected, THE Game_List_Screen SHALL display only ACTIVE games
7. WHEN the 終了 tab is selected, THE Game_List_Screen SHALL display only FINISHED games
8. THE Game_List_Screen SHALL default to showing ACTIVE games
9. THE Game_List_Screen SHALL display a loading skeleton while fetching games
10. WHEN no games exist, THE Game_List_Screen SHALL display a "対局がありません" message
11. THE Game_List_Screen SHALL implement pagination using cursor-based navigation
12. THE Game_List_Screen SHALL use Server_Component for initial rendering

### Requirement 2: ゲームカードコンポーネント

**User Story:** As a user, I want to see game summary information in a card format, so that I can quickly understand the game status.

#### Acceptance Criteria

1. THE Game_Card_Component SHALL display a board thumbnail image
2. THE Game_Card_Component SHALL display the game title
3. THE Game_Card_Component SHALL display the game type (AI vs 集合知)
4. THE Game_Card_Component SHALL display the current turn number
5. THE Game_Card_Component SHALL display the participant count
6. THE Game_Card_Component SHALL display the voting deadline
7. THE Game_Card_Component SHALL display a "詳細を見る" button
8. WHEN the "詳細を見る" button is clicked, THE Game_Card_Component SHALL navigate to the game detail screen
9. THE Game_Card_Component SHALL use Tailwind CSS for styling
10. THE Game_Card_Component SHALL be responsive for mobile and desktop

### Requirement 3: 対局作成画面

**User Story:** As a user, I want to create a new game, so that I can start a new match.

#### Acceptance Criteria

1. THE Game_Create_Screen SHALL display at URL path `/games/new`
2. THE Game_Create_Screen SHALL require user authentication
3. THE Game_Create_Screen SHALL display game type selection (オセロのみ選択可能)
4. THE Game_Create_Screen SHALL display game mode selection (AI vs 集合知のみ選択可能)
5. THE Game_Create_Screen SHALL display first player selection (AI/集合知)
6. THE Game_Create_Screen SHALL disable non-MVP options (チェス、囲碁、将棋、集合知 vs 集合知)
7. THE Game_Create_Screen SHALL validate that all required fields are selected
8. WHEN the 作成 button is clicked, THE Game_Create_Screen SHALL send a POST request to Game_API /api/games
9. WHEN game creation succeeds, THE Game_Create_Screen SHALL redirect to the game detail screen
10. WHEN game creation fails, THE Game_Create_Screen SHALL display an error message
11. THE Game_Create_Screen SHALL use Client_Component for form handling

### Requirement 4: 対局詳細画面

**User Story:** As a user, I want to view detailed game information, so that I can see the current board state and vote on candidates.

#### Acceptance Criteria

1. THE Game_Detail_Screen SHALL display at URL path `/games/[gameId]`
2. THE Game_Detail_Screen SHALL fetch game details from Game_API GET /api/games/:gameId
3. THE Game_Detail_Screen SHALL display the game title and metadata
4. THE Game_Detail_Screen SHALL display the Board_Component with current board state
5. THE Game_Detail_Screen SHALL display disc counts for black and white
6. THE Game_Detail_Screen SHALL display the current player turn
7. THE Game_Detail_Screen SHALL display the Move_History_Component
8. THE Game_Detail_Screen SHALL display AI commentary section
9. THE Game_Detail_Screen SHALL display a list of next move candidates
10. THE Game_Detail_Screen SHALL display a シェア button
11. THE Game_Detail_Screen SHALL display a 候補を投稿 button
12. WHEN the 候補を投稿 button is clicked, THE Game_Detail_Screen SHALL navigate to the candidate post screen
13. THE Game_Detail_Screen SHALL use a two-column layout on desktop
14. THE Game_Detail_Screen SHALL use a single-column layout on mobile
15. THE Game_Detail_Screen SHALL use Server_Component for initial rendering
16. WHEN the game does not exist, THE Game_Detail_Screen SHALL display a 404 error

### Requirement 5: オセロ盤面コンポーネント

**User Story:** As a user, I want to see the Othello board, so that I can understand the current game state.

#### Acceptance Criteria

1. THE Board_Component SHALL display an 8x8 grid
2. THE Board_Component SHALL render cells with green background color (#10b981)
3. THE Board_Component SHALL render grid lines in black
4. THE Board_Component SHALL render black discs as black circles
5. THE Board_Component SHALL render white discs as white circles
6. THE Board_Component SHALL render empty cells as empty squares
7. THE Board_Component SHALL accept boardState as a prop
8. THE Board_Component SHALL accept cellSize as an optional prop (default: 40px desktop, 30px mobile)
9. THE Board_Component SHALL accept onCellClick as an optional prop for interactive mode
10. WHEN onCellClick is provided, THE Board_Component SHALL call the handler when a cell is clicked
11. THE Board_Component SHALL display cell coordinates (A-H, 1-8) on the edges
12. THE Board_Component SHALL be responsive for mobile and desktop
13. THE Board_Component SHALL use semantic HTML for accessibility

### Requirement 6: 手履歴コンポーネント

**User Story:** As a user, I want to see the move history, so that I can review the game progression.

#### Acceptance Criteria

1. THE Move_History_Component SHALL display a scrollable list of moves
2. THE Move_History_Component SHALL display moves in chronological order (newest first)
3. THE Move_History_Component SHALL display the turn number for each move
4. THE Move_History_Component SHALL display the player color for each move
5. THE Move_History_Component SHALL display the move position (e.g., "D3")
6. WHEN a move is clicked, THE Move_History_Component SHALL emit an event with the turn number
7. THE Move_History_Component SHALL highlight the currently selected move
8. THE Move_History_Component SHALL accept moves as a prop
9. THE Move_History_Component SHALL accept onMoveClick as an optional prop
10. THE Move_History_Component SHALL use Client_Component for interactivity

### Requirement 7: 候補カードコンポーネント

**User Story:** As a user, I want to see move candidates in a card format, so that I can understand and vote on them.

#### Acceptance Criteria

1. THE Candidate_Card_Component SHALL display a board preview with the candidate move applied
2. THE Candidate_Card_Component SHALL display the move position (e.g., "C4")
3. THE Candidate_Card_Component SHALL display the candidate description (max 200 characters)
4. THE Candidate_Card_Component SHALL display the vote count
5. THE Candidate_Card_Component SHALL display a 投票する button
6. THE Candidate_Card_Component SHALL display a ✓投票済み indicator when the user has voted
7. WHEN the 投票する button is clicked, THE Candidate_Card_Component SHALL emit a vote event
8. WHEN the user has already voted for this candidate, THE Candidate_Card_Component SHALL disable the button
9. THE Candidate_Card_Component SHALL accept candidate data as a prop
10. THE Candidate_Card_Component SHALL accept isVoted as a prop
11. THE Candidate_Card_Component SHALL accept onVote as a prop
12. THE Candidate_Card_Component SHALL use Client_Component for interactivity

### Requirement 8: 候補投稿画面

**User Story:** As a user, I want to post a move candidate, so that others can vote on my suggested move.

#### Acceptance Criteria

1. THE Candidate_Post_Screen SHALL display at URL path `/games/[gameId]/candidates/new`
2. THE Candidate_Post_Screen SHALL require user authentication
3. THE Candidate_Post_Screen SHALL fetch the current game state from Game_API
4. THE Candidate_Post_Screen SHALL display the Board_Component in interactive mode
5. WHEN a cell is clicked, THE Candidate_Post_Screen SHALL validate if the move is legal
6. WHEN a move is legal, THE Candidate_Post_Screen SHALL highlight the selected cell
7. WHEN a move is illegal, THE Candidate_Post_Screen SHALL display an error message
8. THE Candidate_Post_Screen SHALL display a description textarea (max 200 characters)
9. THE Candidate_Post_Screen SHALL display a character counter
10. THE Candidate_Post_Screen SHALL display a プレビュー button
11. THE Candidate_Post_Screen SHALL display a 投稿 button
12. WHEN the プレビュー button is clicked, THE Candidate_Post_Screen SHALL show a preview of the candidate
13. WHEN the 投稿 button is clicked, THE Candidate_Post_Screen SHALL validate all fields
14. WHEN validation passes, THE Candidate_Post_Screen SHALL send a POST request to create the candidate
15. WHEN candidate creation succeeds, THE Candidate_Post_Screen SHALL redirect to the game detail screen
16. WHEN candidate creation fails, THE Candidate_Post_Screen SHALL display an error message
17. THE Candidate_Post_Screen SHALL use Client_Component for form handling

### Requirement 9: 候補詳細画面

**User Story:** As a user, I want to view detailed candidate information, so that I can share it on social media.

#### Acceptance Criteria

1. THE Candidate_Detail_Screen SHALL display at URL path `/games/[gameId]/candidates/[candidateId]`
2. THE Candidate_Detail_Screen SHALL fetch candidate details from the API
3. THE Candidate_Detail_Screen SHALL display the candidate move position
4. THE Candidate_Detail_Screen SHALL display the Board_Component with the candidate move applied
5. THE Candidate_Detail_Screen SHALL display disc counts after the candidate move
6. THE Candidate_Detail_Screen SHALL display the candidate description
7. THE Candidate_Detail_Screen SHALL display the poster username
8. THE Candidate_Detail_Screen SHALL display the vote count
9. THE Candidate_Detail_Screen SHALL display a 投票する button
10. THE Candidate_Detail_Screen SHALL display a シェア button
11. THE Candidate_Detail_Screen SHALL display a 対局詳細に戻る link
12. THE Candidate_Detail_Screen SHALL use Server_Component for initial rendering
13. WHEN the candidate does not exist, THE Candidate_Detail_Screen SHALL display a 404 error

### Requirement 10: レスポンシブデザイン

**User Story:** As a user, I want the screens to work on mobile and desktop, so that I can use the app on any device.

#### Acceptance Criteria

1. THE Game_List_Screen SHALL use a grid layout on desktop (min-width: 768px)
2. THE Game_List_Screen SHALL use a single-column layout on mobile (max-width: 767px)
3. THE Game_Detail_Screen SHALL use a two-column layout on desktop
4. THE Game_Detail_Screen SHALL use a single-column layout on mobile
5. THE Board_Component SHALL use 40px cell size on desktop
6. THE Board_Component SHALL use 30px cell size on mobile
7. THE Candidate_Post_Screen SHALL use a two-column layout on desktop
8. THE Candidate_Post_Screen SHALL use a single-column layout on mobile
9. ALL screens SHALL be scrollable on mobile
10. ALL interactive elements SHALL be touch-friendly on mobile (min 44px touch target)

### Requirement 11: アクセシビリティ

**User Story:** As a user with disabilities, I want accessible screens, so that I can use the app with assistive technologies.

#### Acceptance Criteria

1. THE Board_Component SHALL use semantic HTML elements
2. THE Board_Component SHALL provide alt text for disc images
3. THE Board_Component SHALL provide ARIA labels for cells
4. ALL interactive elements SHALL be keyboard accessible
5. ALL interactive elements SHALL have visible focus indicators
6. ALL forms SHALL have proper label associations
7. ALL error messages SHALL be announced to screen readers
8. ALL screens SHALL have proper heading hierarchy
9. ALL screens SHALL have a minimum contrast ratio of 4.5:1
10. ALL screens SHALL support keyboard navigation

### Requirement 12: エラーハンドリング

**User Story:** As a user, I want clear error messages, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN an API request fails, THE screens SHALL display a user-friendly error message
2. WHEN a network error occurs, THE screens SHALL display a "ネットワークエラーが発生しました" message
3. WHEN a 404 error occurs, THE screens SHALL display a "対局が見つかりません" message
4. WHEN a validation error occurs, THE screens SHALL display field-specific error messages
5. WHEN an authentication error occurs, THE screens SHALL redirect to the login screen
6. THE screens SHALL log errors to the console for debugging
7. THE screens SHALL not expose sensitive information in error messages

### Requirement 13: ローディング状態

**User Story:** As a user, I want to see loading indicators, so that I know the app is working.

#### Acceptance Criteria

1. WHEN fetching games, THE Game_List_Screen SHALL display a skeleton loader
2. WHEN fetching game details, THE Game_Detail_Screen SHALL display a loading spinner
3. WHEN submitting a form, THE screens SHALL disable the submit button
4. WHEN submitting a form, THE screens SHALL display a loading indicator on the button
5. THE screens SHALL use Suspense boundaries for async components
6. THE screens SHALL provide fallback UI for loading states

### Requirement 14: 型安全性

**User Story:** As a developer, I want type-safe components, so that I can prevent runtime errors.

#### Acceptance Criteria

1. ALL components SHALL use TypeScript strict mode
2. ALL components SHALL define prop types using TypeScript interfaces
3. ALL API responses SHALL be typed using the types from packages/api/src/types/game.ts
4. ALL components SHALL validate props at runtime when necessary
5. ALL event handlers SHALL have proper type annotations
6. THE components SHALL not use `any` type
7. THE components SHALL use Zod for runtime validation where appropriate

### Requirement 15: テスト可能性

**User Story:** As a developer, I want testable components, so that I can ensure code quality.

#### Acceptance Criteria

1. ALL components SHALL be unit tested using Vitest
2. ALL components SHALL be tested with React Testing Library
3. ALL interactive components SHALL have user interaction tests
4. ALL forms SHALL have validation tests
5. ALL API calls SHALL be mocked in tests
6. ALL components SHALL have accessibility tests
7. THE tests SHALL achieve at least 80% code coverage
8. THE tests SHALL use property-based testing for complex logic where appropriate
