# Implementation Plan: Othello Game Logic

## Overview

This plan implements a pure, functional TypeScript module for Othello (Reversi) game logic. The implementation follows immutable data patterns, uses comprehensive type safety, and includes both unit tests and property-based tests using fast-check. All modules are designed as pure functions with no side effects, making them highly testable and reliable.

## Tasks

- [x] 1. Set up project structure and core type definitions
  - Create `packages/api/src/lib/othello/` directory
  - Implement `types.ts` with all core types (CellState, Player, Position, Direction, Board, GameState, Move, ValidationResult, SerializedGameState, GameResult)
  - Export DIRECTIONS constant with all 8 direction vectors
  - _Requirements: 1.1, 2.4, 9.1, 9.2, 9.3, 9.4, 10.2, 10.3, 10.4_

- [ ] 2. Implement board initialization and basic operations
  - [ ] 2.1 Implement board module (board.ts)
    - Write `createInitialBoard()` to create 8x8 board with standard Othello starting position
    - Write `getCellState()`, `setCellState()`, `isValidPosition()` helper functions
    - Write `getEmptyPositions()`, `countDiscs()`, `isBoardFull()` utility functions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.2, 7.1, 7.2_

  - [ ] 2.2 Write unit tests for board module (board.test.ts)
    - Test initial board configuration matches Othello rules
    - Test cell state getters and setters
    - Test position validation for valid and invalid coordinates
    - Test empty position detection and disc counting
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 2.3 Write property test for board initialization
    - **Property 1: Board initialization creates correct structure**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    - Test that createInitialBoard() always produces 8x8 board with exactly 4 discs in correct positions
    - Use fast-check with numRuns: 100
    - _File: board.property.test.ts_

- [ ] 3. Implement move validation logic
  - [ ] 3.1 Implement validation module (validation.ts)
    - Write `checkDirection()` to find flippable discs in a single direction
    - Write `findFlippedPositions()` to check all 8 directions
    - Write `validateMove()` to determine if a move is legal
    - Write `getLegalMoves()` and `hasLegalMoves()` for move detection
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.2 Write unit tests for validation module (validation.test.ts)
    - Test occupied cell rejection
    - Test moves without flips are invalid
    - Test moves with flips in various directions
    - Test out-of-bounds position rejection
    - Test legal moves detection for known board positions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.3 Write property tests for validation rules (validation.property.test.ts)
    - **Property 2: Occupied cells reject moves**
    - **Validates: Requirements 2.1**
    - **Property 3: Moves without flips are invalid**
    - **Validates: Requirements 2.2**
    - **Property 4: Moves with flips are valid**
    - **Validates: Requirements 2.3**
    - **Property 5: All eight directions are checked**
    - **Validates: Requirements 2.4**
    - **Property 6: Direction checking validates line structure**
    - **Validates: Requirements 2.5**
    - **Property 7: Out-of-bounds positions are invalid**
    - **Validates: Requirements 2.6**
    - **Property 12: Legal moves detection is complete and accurate**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - **Property 13: No legal moves returns empty list**
    - **Validates: Requirements 4.4**
    - Use fast-check with numRuns: 100, custom board and position generators

- [ ] 4. Implement move execution and board updates
  - [ ] 4.1 Implement moves module (moves.ts)
    - Write `flipDiscs()` to flip discs at specified positions
    - Write `executeMove()` to place disc and flip opponents
    - Write `createMove()` to create move records
    - Ensure all operations are immutable (return new board instances)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.2, 10.3, 10.4_

  - [ ] 4.2 Write unit tests for moves module (moves.test.ts)
    - Test disc placement at specified position
    - Test flipping in single and multiple directions
    - Test immutability (original board unchanged)
    - Test move record creation with complete data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 4.3 Write property tests for move execution (moves.property.test.ts)
    - **Property 8: Valid moves place disc and flip opponents**
    - **Validates: Requirements 3.1, 3.2**
    - **Property 9: Flips only occur between anchoring discs**
    - **Validates: Requirements 3.3**
    - **Property 10: Board updates are atomic**
    - **Validates: Requirements 3.4**
    - **Property 11: Invalid moves don't modify board**
    - **Validates: Requirements 3.5**
    - Use fast-check with numRuns: 100

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement game state management and turn logic
  - [ ] 6.1 Implement game-state module (game-state.ts)
    - Write `createInitialGameState()` to initialize game with starting board
    - Write `switchPlayer()` to alternate between Black and White
    - Write `makeMove()` to validate and execute moves, updating game state
    - Write `shouldEndGame()` and `updateGameStatus()` for game end detection
    - Write `processTurn()` to handle turn logic including automatic pass
    - _Requirements: 1.7, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.2 Write unit tests for game-state module (game-state.test.ts)
    - Test initial game state creation
    - Test player switching after valid moves
    - Test automatic pass when player has no legal moves
    - Test game end detection (no moves, full board, single color)
    - Test move rejection on finished games
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.3 Write property tests for state transitions (game-state.property.test.ts)
    - **Property 14: Valid moves switch player**
    - **Validates: Requirements 5.1**
    - **Property 15: No legal moves causes pass**
    - **Validates: Requirements 5.2**
    - **Property 16: Double pass ends game**
    - **Validates: Requirements 5.3, 6.1**
    - **Property 17: Current player is always tracked**
    - **Validates: Requirements 5.4**
    - **Property 18: Full board ends game**
    - **Validates: Requirements 6.2**
    - **Property 19: Single color ends game**
    - **Validates: Requirements 6.3**
    - **Property 20: In-progress games accept valid moves**
    - **Validates: Requirements 6.4**
    - **Property 21: Finished games reject all moves**
    - **Validates: Requirements 6.5**
    - Use fast-check with numRuns: 100

- [ ] 7. Implement scoring and winner determination
  - [ ] 7.1 Implement scoring module (scoring.ts)
    - Write `calculateScores()` to count Black and White discs
    - Write `determineWinner()` to identify winner or draw
    - Write `updateScores()` to update game state with current scores
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 7.2 Write unit tests for scoring module (scoring.test.ts)
    - Test score calculation for various board states
    - Test winner determination (Black wins, White wins, draw)
    - Test that in-progress games have no winner
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 7.3 Write property tests for scoring
    - **Property 22: Score calculation is accurate**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
    - **Property 23: Winner determination is correct**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    - **Property 24: In-progress games have no winner**
    - **Validates: Requirements 8.5**
    - Use fast-check with numRuns: 100
    - _File: scoring.property.test.ts_

- [ ] 8. Implement serialization and deserialization
  - [ ] 8.1 Implement serialization module (serialization.ts)
    - Write `serializeGameState()` to convert GameState to plain JSON object
    - Write `validateSerializedState()` to validate structure and values
    - Write `deserializeGameState()` to restore GameState from JSON
    - Handle all edge cases and invalid data gracefully
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 8.2 Write unit tests for serialization module (serialization.test.ts)
    - Test serialization of various game states
    - Test deserialization of valid serialized data
    - Test rejection of invalid serialized data (missing fields, wrong types, invalid values)
    - Test round-trip consistency
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 8.3 Write property tests for serialization
    - **Property 25: Serialization round-trip preserves state**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
    - **Property 26: Invalid serialized data is rejected**
    - **Validates: Requirements 9.6**
    - Use fast-check with numRuns: 100
    - _File: serialization.property.test.ts_

- [ ] 9. Implement move history tracking
  - [ ] 9.1 Implement history module (history.ts)
    - Write `addMoveToHistory()` to append moves to history
    - Write `getLastMove()`, `getMoveAt()`, `getMoveCount()` accessor functions
    - Ensure immutability of history operations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 9.2 Write unit tests for history module (history.test.ts)
    - Test adding moves to history
    - Test history order preservation
    - Test accessor functions (getLastMove, getMoveAt, getMoveCount)
    - Test immutability of history operations
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 9.3 Write property tests for history tracking
    - **Property 27: Move history grows with each move**
    - **Validates: Requirements 10.1**
    - **Property 28: Move records are complete**
    - **Validates: Requirements 10.2, 10.3, 10.4**
    - **Property 29: Move history preserves order**
    - **Validates: Requirements 10.5**
    - **Property 30: Complete history is accessible**
    - **Validates: Requirements 10.6**
    - Use fast-check with numRuns: 100
    - _File: history.property.test.ts_

- [ ] 10. Create public API and integration
  - [ ] 10.1 Implement index.ts with public API exports
    - Export all public functions and types
    - Re-export from individual modules
    - Document the public API surface
    - _Requirements: All requirements (public interface)_

  - [ ] 10.2 Write integration tests
    - Test complete game flow from initialization to completion
    - Test multiple moves in sequence
    - Test edge cases like immediate game end scenarios
    - Test interaction between all modules
    - _File: index.test.ts_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify test coverage meets goals (>95% line coverage)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with minimum 100 iterations (numRuns: 100)
- All implementations follow immutable patterns (no mutations)
- TypeScript strict mode is enabled for maximum type safety
- Follow the implementation guide rules: no asyncProperty in fast-check tests
