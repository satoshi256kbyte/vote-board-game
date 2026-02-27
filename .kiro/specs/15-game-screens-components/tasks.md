# Tasks

## Task 1: Setup Frontend Package Structure

**Status:** pending
**Dependencies:** None

### Description

Create the frontend package structure for the Next.js 16 application with proper TypeScript configuration and dependencies.

### Acceptance Criteria

- [ ] Create `packages/web` directory
- [ ] Initialize Next.js 16 with App Router
- [ ] Configure TypeScript with strict mode
- [ ] Install dependencies: React 19, Tailwind CSS, shadcn/ui, Lucide React
- [ ] Configure Tailwind CSS
- [ ] Setup Vitest for testing
- [ ] Configure ESLint and Prettier
- [ ] Create basic folder structure: `app/`, `components/`, `lib/`, `types/`

---

## Task 2: Create Type Definitions

**Status:** pending
**Dependencies:** Task 1

### Description

Create TypeScript type definitions for game data structures that match the API types.

### Acceptance Criteria

- [ ] Create `packages/web/types/game.ts`
- [ ] Define Game, GameStatus, GameType, GameMode types
- [ ] Define Candidate, Vote types
- [ ] Define Move, BoardState types
- [ ] Ensure types match `packages/api/src/types/game.ts`
- [ ] Export all types from index file

---

## Task 3: Create API Client

**Status:** pending
**Dependencies:** Task 2

### Description

Create a type-safe API client for communicating with the Game API.

### Acceptance Criteria

- [ ] Create `packages/web/lib/api/client.ts`
- [ ] Implement `fetchGames()` function
- [ ] Implement `fetchGame(gameId)` function
- [ ] Implement `createGame(data)` function
- [ ] Implement `fetchCandidates(gameId)` function
- [ ] Implement `createCandidate(gameId, data)` function
- [ ] Implement `vote(gameId, candidateId)` function
- [ ] Add proper error handling
- [ ] Add TypeScript types for all functions
- [ ] Write unit tests with Vitest

---

## Task 4: Create Board Component

**Status:** pending
**Dependencies:** Task 2

### Description

Create the Othello board component that displays the 8x8 grid with discs.

### Acceptance Criteria

- [ ] Create `packages/web/components/board.tsx`
- [ ] Render 8x8 grid with green background
- [ ] Render black and white discs based on boardState prop
- [ ] Display cell coordinates (A-H, 1-8)
- [ ] Support cellSize prop (default: 40px desktop, 30px mobile)
- [ ] Support onCellClick prop for interactive mode
- [ ] Make responsive for mobile and desktop
- [ ] Add ARIA labels for accessibility
- [ ] Use semantic HTML
- [ ] Write unit tests with React Testing Library
- [ ] Write accessibility tests

---

## Task 5: Create Game Card Component

**Status:** pending
**Dependencies:** Task 2

### Description

Create a card component that displays game summary information.

### Acceptance Criteria

- [ ] Create `packages/web/components/game-card.tsx`
- [ ] Display board thumbnail image
- [ ] Display game title
- [ ] Display game type (AI vs 集合知)
- [ ] Display current turn number
- [ ] Display participant count
- [ ] Display voting deadline
- [ ] Add "詳細を見る" button with navigation
- [ ] Make responsive for mobile and desktop
- [ ] Use Tailwind CSS for styling
- [ ] Write unit tests with React Testing Library

---

## Task 6: Create Move History Component

**Status:** pending
**Dependencies:** Task 2

### Description

Create a component that displays the move history in a scrollable list.

### Acceptance Criteria

- [ ] Create `packages/web/components/move-history.tsx` as Client Component
- [ ] Display moves in chronological order (newest first)
- [ ] Display turn number, player color, and position for each move
- [ ] Support onMoveClick prop
- [ ] Highlight selected move
- [ ] Make scrollable
- [ ] Use Tailwind CSS for styling
- [ ] Write unit tests with React Testing Library
- [ ] Write interaction tests

---

## Task 7: Create Candidate Card Component

**Status:** pending
**Dependencies:** Task 2, Task 4

### Description

Create a card component that displays move candidate information with voting functionality.

### Acceptance Criteria

- [ ] Create `packages/web/components/candidate-card.tsx` as Client Component
- [ ] Display board preview with candidate move applied
- [ ] Display move position (e.g., "C4")
- [ ] Display candidate description (max 200 characters)
- [ ] Display vote count
- [ ] Add "投票する" button
- [ ] Show "✓投票済み" indicator when voted
- [ ] Disable button when already voted
- [ ] Support onVote prop
- [ ] Make responsive for mobile and desktop
- [ ] Write unit tests with React Testing Library
- [ ] Write interaction tests

---

## Task 8: Create Game List Screen

**Status:** pending
**Dependencies:** Task 3, Task 5

### Description

Create the game list screen (top page) that displays all games with filtering.

### Acceptance Criteria

- [ ] Create `packages/web/app/page.tsx` as Server Component
- [ ] Fetch games from API
- [ ] Display games in grid layout (desktop) / single column (mobile)
- [ ] Add tabs for filtering by status (進行中/終了)
- [ ] Default to showing ACTIVE games
- [ ] Implement cursor-based pagination
- [ ] Display loading skeleton
- [ ] Display "対局がありません" when no games
- [ ] Handle errors gracefully
- [ ] Write unit tests
- [ ] Write integration tests

---

## Task 9: Create Game Create Screen

**Status:** pending
**Dependencies:** Task 3

### Description

Create the game creation screen with form validation.

### Acceptance Criteria

- [ ] Create `packages/web/app/games/new/page.tsx` as Client Component
- [ ] Require user authentication
- [ ] Add game type selection (オセロのみ)
- [ ] Add game mode selection (AI vs 集合知のみ)
- [ ] Add first player selection (AI/集合知)
- [ ] Disable non-MVP options
- [ ] Validate all required fields
- [ ] Send POST request to create game
- [ ] Redirect to game detail on success
- [ ] Display error message on failure
- [ ] Make responsive for mobile and desktop
- [ ] Write unit tests
- [ ] Write form validation tests

---

## Task 10: Create Game Detail Screen

**Status:** pending
**Dependencies:** Task 3, Task 4, Task 6, Task 7

### Description

Create the game detail screen that displays the board, candidates, and game information.

### Acceptance Criteria

- [ ] Create `packages/web/app/games/[gameId]/page.tsx` as Server Component
- [ ] Fetch game details from API
- [ ] Display game title and metadata
- [ ] Display Board Component with current state
- [ ] Display disc counts for black and white
- [ ] Display current player turn
- [ ] Display Move History Component
- [ ] Display AI commentary section
- [ ] Display list of next move candidates
- [ ] Add "シェア" button
- [ ] Add "候補を投稿" button with navigation
- [ ] Use two-column layout (desktop) / single-column (mobile)
- [ ] Display 404 error when game not found
- [ ] Handle errors gracefully
- [ ] Write unit tests
- [ ] Write integration tests

---

## Task 11: Create Candidate Post Screen

**Status:** pending
**Dependencies:** Task 3, Task 4

### Description

Create the candidate posting screen with interactive board and validation.

### Acceptance Criteria

- [ ] Create `packages/web/app/games/[gameId]/candidates/new/page.tsx` as Client Component
- [ ] Require user authentication
- [ ] Fetch current game state
- [ ] Display Board Component in interactive mode
- [ ] Validate move legality on cell click
- [ ] Highlight selected cell for legal moves
- [ ] Display error for illegal moves
- [ ] Add description textarea (max 200 characters)
- [ ] Add character counter
- [ ] Add "プレビュー" button
- [ ] Add "投稿" button
- [ ] Show preview of candidate
- [ ] Validate all fields before submission
- [ ] Send POST request to create candidate
- [ ] Redirect to game detail on success
- [ ] Display error message on failure
- [ ] Use two-column layout (desktop) / single-column (mobile)
- [ ] Write unit tests
- [ ] Write form validation tests
- [ ] Write interaction tests

---

## Task 12: Create Candidate Detail Screen

**Status:** pending
**Dependencies:** Task 3, Task 4

### Description

Create the candidate detail screen for viewing and sharing candidates.

### Acceptance Criteria

- [ ] Create `packages/web/app/games/[gameId]/candidates/[candidateId]/page.tsx` as Server Component
- [ ] Fetch candidate details from API
- [ ] Display candidate move position
- [ ] Display Board Component with candidate move applied
- [ ] Display disc counts after candidate move
- [ ] Display candidate description
- [ ] Display poster username
- [ ] Display vote count
- [ ] Add "投票する" button
- [ ] Add "シェア" button
- [ ] Add "対局詳細に戻る" link
- [ ] Display 404 error when candidate not found
- [ ] Handle errors gracefully
- [ ] Write unit tests
- [ ] Write integration tests

---

## Task 13: Implement Loading States

**Status:** pending
**Dependencies:** Task 8, Task 9, Task 10, Task 11, Task 12

### Description

Add loading indicators and skeleton loaders to all screens.

### Acceptance Criteria

- [ ] Create `packages/web/app/loading.tsx` for game list
- [ ] Create `packages/web/app/games/[gameId]/loading.tsx` for game detail
- [ ] Add skeleton loader for game cards
- [ ] Add loading spinner for game detail
- [ ] Disable submit buttons during form submission
- [ ] Add loading indicator on submit buttons
- [ ] Use Suspense boundaries for async components
- [ ] Provide fallback UI for all loading states
- [ ] Write tests for loading states

---

## Task 14: Implement Error Handling

**Status:** pending
**Dependencies:** Task 8, Task 9, Task 10, Task 11, Task 12

### Description

Add comprehensive error handling to all screens.

### Acceptance Criteria

- [ ] Create `packages/web/app/error.tsx` for global errors
- [ ] Create `packages/web/app/games/[gameId]/error.tsx` for game errors
- [ ] Display user-friendly error messages
- [ ] Display "ネットワークエラーが発生しました" for network errors
- [ ] Display "対局が見つかりません" for 404 errors
- [ ] Display field-specific validation errors
- [ ] Redirect to login for authentication errors
- [ ] Log errors to console for debugging
- [ ] Do not expose sensitive information
- [ ] Write tests for error scenarios

---

## Task 15: Implement Accessibility Features

**Status:** pending
**Dependencies:** Task 4, Task 5, Task 6, Task 7

### Description

Ensure all components meet accessibility standards.

### Acceptance Criteria

- [ ] Use semantic HTML in all components
- [ ] Add alt text for all images
- [ ] Add ARIA labels where needed
- [ ] Ensure keyboard accessibility for all interactive elements
- [ ] Add visible focus indicators
- [ ] Associate labels with form inputs
- [ ] Announce error messages to screen readers
- [ ] Use proper heading hierarchy
- [ ] Ensure minimum contrast ratio of 4.5:1
- [ ] Support keyboard navigation
- [ ] Write accessibility tests with jest-axe
- [ ] Test with screen reader

---

## Task 16: Implement Responsive Design

**Status:** pending
**Dependencies:** Task 8, Task 9, Task 10, Task 11, Task 12

### Description

Ensure all screens work properly on mobile and desktop devices.

### Acceptance Criteria

- [ ] Use grid layout on desktop for game list
- [ ] Use single-column layout on mobile for game list
- [ ] Use two-column layout on desktop for game detail
- [ ] Use single-column layout on mobile for game detail
- [ ] Use 40px cell size on desktop for board
- [ ] Use 30px cell size on mobile for board
- [ ] Use two-column layout on desktop for candidate post
- [ ] Use single-column layout on mobile for candidate post
- [ ] Make all screens scrollable on mobile
- [ ] Ensure 44px minimum touch target on mobile
- [ ] Test on various screen sizes
- [ ] Write responsive design tests

---

## Task 17: Write Integration Tests

**Status:** pending
**Dependencies:** Task 8, Task 9, Task 10, Task 11, Task 12

### Description

Write comprehensive integration tests for all screens.

### Acceptance Criteria

- [ ] Write integration tests for game list screen
- [ ] Write integration tests for game create screen
- [ ] Write integration tests for game detail screen
- [ ] Write integration tests for candidate post screen
- [ ] Write integration tests for candidate detail screen
- [ ] Mock API calls in tests
- [ ] Test user flows (create game → view detail → post candidate → vote)
- [ ] Test error scenarios
- [ ] Test loading states
- [ ] Achieve at least 80% code coverage
- [ ] Use property-based testing where appropriate

---

## Task 18: Add Share Functionality

**Status:** pending
**Dependencies:** Task 10, Task 12

### Description

Implement social media sharing functionality for games and candidates.

### Acceptance Criteria

- [ ] Create `packages/web/components/share-button.tsx`
- [ ] Support Web Share API where available
- [ ] Fallback to copy link for unsupported browsers
- [ ] Generate share text with game/candidate information
- [ ] Add share button to game detail screen
- [ ] Add share button to candidate detail screen
- [ ] Display success message after sharing
- [ ] Write unit tests
- [ ] Write interaction tests

---

## Task 19: Setup OGP Image Generation

**Status:** pending
**Dependencies:** Task 4

### Description

Implement OGP image generation for social media sharing.

### Acceptance Criteria

- [ ] Install @vercel/og or satori
- [ ] Create `packages/web/app/api/og/game/[gameId]/route.tsx`
- [ ] Create `packages/web/app/api/og/candidate/[candidateId]/route.tsx`
- [ ] Generate board thumbnail for games
- [ ] Generate board with candidate move for candidates
- [ ] Add metadata to game detail page
- [ ] Add metadata to candidate detail page
- [ ] Test OGP images in social media debuggers
- [ ] Write unit tests

---

## Task 20: Documentation and Cleanup

**Status:** pending
**Dependencies:** All previous tasks

### Description

Document the frontend implementation and clean up code.

### Acceptance Criteria

- [ ] Write README for packages/web
- [ ] Document component props and usage
- [ ] Document API client functions
- [ ] Add JSDoc comments to complex functions
- [ ] Remove unused code and dependencies
- [ ] Run ESLint and fix all warnings
- [ ] Run Prettier to format all files
- [ ] Verify all tests pass
- [ ] Verify TypeScript compilation succeeds
- [ ] Create component storybook (optional)
