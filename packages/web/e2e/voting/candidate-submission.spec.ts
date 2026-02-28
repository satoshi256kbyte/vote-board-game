/**
 * E2E tests for candidate submission
 * Tests submitting new move candidates
 */

import { test, expect } from "../fixtures";;
import { VotingPage } from '../page-objects/voting-page';

// Merge fixtures

test.describe('Candidate Submission', () => {
  test('should submit new candidate successfully', async ({ authenticatedPage, game }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Submit new candidate with description
    const candidateDescription = 'テスト候補: 攻撃的な配置で相手の選択肢を制限する戦略です。';
    await votingPage.submitNewCandidate(candidateDescription);

    // Verify success message is displayed
    await votingPage.expectSuccessMessage();
  });

  test('should display candidate description', async ({ authenticatedPage, game }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Submit new candidate
    const candidateDescription = 'テスト候補: 中央を確保して盤面をコントロールする手です。';
    await votingPage.submitNewCandidate(candidateDescription);

    // Wait for success
    await votingPage.expectSuccessMessage();

    // Reload page to see the new candidate
    await votingPage.goto(game.gameId);

    // Verify candidate appears in list with description
    await votingPage.expectCandidateInList(candidateDescription);
  });

  test('should show error for invalid candidate data', async ({ authenticatedPage, game }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Try to submit candidate with empty description
    await votingPage.fillCandidateDescription('');
    await authenticatedPage.getByTestId('vote-submit-candidate-button').click();

    // Verify error message is displayed
    await votingPage.expectErrorMessage('説明文を入力してください');
  });

  test('should show error for description exceeding 200 characters', async ({
    authenticatedPage,
    game,
  }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Try to submit candidate with description over 200 characters
    const longDescription = 'あ'.repeat(201);
    await votingPage.fillCandidateDescription(longDescription);
    await authenticatedPage.getByTestId('vote-submit-candidate-button').click();

    // Verify error message is displayed
    await votingPage.expectErrorMessage('説明文は200文字以内で入力してください');
  });

  test('should display submitted candidate in candidate list', async ({
    authenticatedPage,
    game,
  }) => {
    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Submit new candidate
    const candidateDescription = 'テスト候補: 守備的な配置で安定した展開を目指す手です。';
    await votingPage.submitNewCandidate(candidateDescription);

    // Wait for success
    await votingPage.expectSuccessMessage();

    // Reload page
    await votingPage.goto(game.gameId);

    // Verify candidate is in the list
    await votingPage.expectCandidateInList(candidateDescription);

    // Verify candidates list is visible
    await votingPage.expectCandidatesVisible();
  });

  test('should complete within 45 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();

    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Submit new candidate
    const candidateDescription = 'テスト候補: パフォーマンステスト用の候補です。';
    await votingPage.submitNewCandidate(candidateDescription);

    // Verify success
    await votingPage.expectSuccessMessage();

    // Reload and verify candidate appears
    await votingPage.goto(game.gameId);
    await votingPage.expectCandidateInList(candidateDescription);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 45 seconds
    expect(duration).toBeLessThan(45);
  });
});
