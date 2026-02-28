/**
 * E2E tests for vote submission
 * Tests voting on move candidates
 */

import { test, expect } from "../fixtures";;
import { VotingPage } from '../page-objects/voting-page';
import { createTestCandidate } from '../helpers/test-data';

// Merge fixtures

test.describe('Vote Submission', () => {
  test('should display move candidates', async ({ authenticatedPage, game }) => {
    // Create test candidate
    const candidate = await createTestCandidate(game.gameId);
    game.candidates.push(candidate);

    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Verify candidates are visible
    await votingPage.expectCandidatesVisible();

    // Verify candidate description is displayed
    await votingPage.expectCandidateDescription(candidate.candidateId, candidate.description);
  });

  test('should submit vote successfully', async ({ authenticatedPage, game }) => {
    // Create test candidate
    const candidate = await createTestCandidate(game.gameId);
    game.candidates.push(candidate);

    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Select candidate and submit vote
    await votingPage.vote(candidate.candidateId);

    // Verify success message is displayed
    await votingPage.expectSuccessMessage();
  });

  test('should show voted status after submission', async ({ authenticatedPage, game }) => {
    // Create test candidate
    const candidate = await createTestCandidate(game.gameId);
    game.candidates.push(candidate);

    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Submit vote
    await votingPage.vote(candidate.candidateId);

    // Wait for success message
    await votingPage.expectSuccessMessage();

    // Reload page to verify voted status persists
    await votingPage.goto(game.gameId);

    // Verify voted status is displayed (submit button should be disabled or show voted state)
    const submitButton = authenticatedPage.getByTestId('vote-submit-button');
    await expect(submitButton).toBeDisabled();
  });

  test('should complete within 45 seconds', async ({ authenticatedPage, game }) => {
    const startTime = Date.now();

    // Create test candidate
    const candidate = await createTestCandidate(game.gameId);
    game.candidates.push(candidate);

    const votingPage = new VotingPage(authenticatedPage);

    // Navigate to voting page
    await votingPage.goto(game.gameId);

    // Verify candidates are visible
    await votingPage.expectCandidatesVisible();

    // Submit vote
    await votingPage.vote(candidate.candidateId);

    // Verify success message
    await votingPage.expectSuccessMessage();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Verify test completed within 45 seconds
    expect(duration).toBeLessThan(45);
  });
});
