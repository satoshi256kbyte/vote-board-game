/**
 * Test data helper functions for E2E tests
 * Manages test games and candidates in DynamoDB
 */

import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient, withCredentialRefresh } from './aws-client-factory';

export interface TestGame {
  gameId: string;
  status: 'active' | 'completed';
  candidates: TestCandidate[];
}

export interface TestCandidate {
  candidateId: string;
  description: string;
  moveData: string;
}

/**
 * Creates a test game in DynamoDB
 *
 * Requirements:
 * - 7.4: Test data should include at least one active game
 * - 7.5: Test data should represent realistic game states
 *
 * @returns Promise that resolves to TestGame object
 */
export async function createTestGame(): Promise<TestGame> {
  const timestamp = Date.now();
  const gameId = `test-game-${timestamp}`;

  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.warn(
        '[CreateTestGame] DYNAMODB_TABLE_NAME environment variable is not set. Skipping test game creation.'
      );
      // Return a mock game for testing without DynamoDB
      return {
        gameId,
        status: 'active',
        candidates: [],
      };
    }

    // withCredentialRefresh でラップし、ExpiredTokenException 時にリトライ
    // Create initial board state (empty Othello board)
    const initialBoardState = Array(8)
      .fill(null)
      .map(() => Array(8).fill(0));
    // Set initial pieces (standard Othello starting position)
    initialBoardState[3][3] = 1; // White
    initialBoardState[3][4] = 2; // Black
    initialBoardState[4][3] = 2; // Black
    initialBoardState[4][4] = 1; // White

    const game = {
      PK: `GAME#${gameId}`,
      SK: `GAME#${gameId}`,
      gameId,
      status: 'active',
      boardState: JSON.stringify(initialBoardState),
      currentPlayer: 2, // Black starts
      moveHistory: [],
      aiCommentary: 'テストゲームが開始されました。黒の番です。',
      votingDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await withCredentialRefresh(async () => {
      const docClient = getDynamoDocClient();

      const command = new PutCommand({
        TableName: tableName,
        Item: game,
      });

      await docClient.send(command);
    });

    console.log(`[CreateTestGame] Successfully created test game: ${gameId}`);

    // Create test candidates for the game
    const candidates: TestCandidate[] = [];
    try {
      // Create 3 test candidates
      for (let i = 0; i < 3; i++) {
        const candidate = await createTestCandidate(gameId, i);
        candidates.push(candidate);
      }
      console.log(`[CreateTestGame] Successfully created ${candidates.length} test candidates`);
    } catch (error) {
      console.warn(`[CreateTestGame] Failed to create test candidates:`, error);
      // Continue even if candidate creation fails
    }

    return {
      gameId,
      status: 'active',
      candidates,
    };
  } catch (error) {
    console.error(`[CreateTestGame] Failed to create test game`, error);
    throw error;
  }
}

/**
 * Creates a test candidate for a game in DynamoDB
 *
 * Requirements:
 * - 7.4: Test data should include move candidates for voting tests
 * - 7.5: Candidates should have descriptions (max 200 characters)
 *
 * @param gameId - ID of the game to add candidate to
 * @returns Promise that resolves to TestCandidate object
 */
export async function createTestCandidate(
  gameId: string,
  index: number = 0
): Promise<TestCandidate> {
  const timestamp = Date.now();
  const candidateId = `test-candidate-${timestamp}-${index}`;

  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.warn(
        '[CreateTestCandidate] DYNAMODB_TABLE_NAME environment variable is not set. Skipping test candidate creation.'
      );
      // Return a mock candidate for testing without DynamoDB
      return {
        candidateId,
        description: `テスト候補${index + 1}: 中央付近に配置して優位を確保する戦略です。`,
        moveData: JSON.stringify({ row: 2 + index, col: 3 }),
      };
    }

    // Create test moves with different positions
    const positions = [
      { row: 2, col: 3, desc: '中央付近に配置して優位を確保する戦略です。' },
      { row: 2, col: 4, desc: '右側を攻めて相手の選択肢を制限します。' },
      { row: 3, col: 2, desc: '左側から攻めて盤面をコントロールします。' },
    ];
    const position = positions[index % positions.length];
    const moveData = JSON.stringify({ row: position.row, col: position.col });
    const description = `テスト候補${index + 1}: ${position.desc}`;

    const candidate = {
      PK: `GAME#${gameId}`,
      SK: `CANDIDATE#${candidateId}`,
      candidateId,
      gameId,
      description,
      moveData,
      voteCount: 0,
      createdAt: new Date().toISOString(),
    };

    await withCredentialRefresh(async () => {
      const docClient = getDynamoDocClient();

      const command = new PutCommand({
        TableName: tableName,
        Item: candidate,
      });

      await docClient.send(command);
    });

    console.log(`[CreateTestCandidate] Successfully created test candidate: ${candidateId}`);

    return {
      candidateId,
      description,
      moveData,
    };
  } catch (error) {
    console.error(`[CreateTestCandidate] Failed to create test candidate`, error);
    throw error;
  }
}

/**
 * Cleans up a test game and its associated data from DynamoDB
 *
 * Requirements:
 * - 7.2: Test data should be cleaned up after test completion
 * - 7.5: Cleanup failures should be logged and execution should continue
 *
 * @param game - Test game to clean up
 * @returns Promise that resolves when cleanup is complete (never throws)
 */
export async function cleanupTestGame(game: TestGame): Promise<void> {
  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.warn(
        '[CleanupTestGame] DYNAMODB_TABLE_NAME environment variable is not set. Skipping test game cleanup.'
      );
      return;
    }

    await withCredentialRefresh(async () => {
      const docClient = getDynamoDocClient();

      // Delete game
      const deleteGameCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `GAME#${game.gameId}`,
          SK: `GAME#${game.gameId}`,
        },
      });

      await docClient.send(deleteGameCommand);

      // Delete candidates
      for (const candidate of game.candidates) {
        const deleteCandidateCommand = new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: `GAME#${game.gameId}`,
            SK: `CANDIDATE#${candidate.candidateId}`,
          },
        });

        await docClient.send(deleteCandidateCommand);
      }
    });

    console.log(`[CleanupTestGame] Successfully cleaned up test game: ${game.gameId}`);
  } catch (error) {
    // Log error but don't throw - cleanup failures should not fail tests
    console.error(`[CleanupTestGame] Failed to clean up test game: ${game.gameId}`, error);
    console.error('[CleanupTestGame] Continuing execution despite cleanup failure');
  }
}
