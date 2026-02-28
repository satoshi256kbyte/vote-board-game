import { type Page, expect } from '@playwright/test';
import {
  waitForNetworkIdle,
  waitForLoadingComplete,
  retryAssertion,
  waitForApiResponse,
  TIMEOUTS,
} from '../helpers/wait-utils';

export class VotingPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(gameId: string): Promise<void> {
    await this.page.goto(`/games/${gameId}/vote`);
    await waitForNetworkIdle(this.page);
    await waitForLoadingComplete(this.page);
  }

  // Actions
  async selectCandidate(candidateId: string): Promise<void> {
    const candidateElement = this.page.getByTestId(`vote-candidate-${candidateId}`);
    await expect(candidateElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await candidateElement.click();
  }

  async submitVote(): Promise<void> {
    const submitButton = this.page.getByTestId('vote-submit-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(submitButton).toBeEnabled({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for vote submission API call
    await waitForApiResponse(this.page, /\/api\/.*\/vote/, { timeout: TIMEOUTS.LONG });
  }

  async vote(candidateId: string): Promise<void> {
    await this.selectCandidate(candidateId);
    await this.submitVote();
  }

  async fillCandidateDescription(description: string): Promise<void> {
    const descriptionInput = this.page.getByTestId('vote-candidate-description-input');
    await expect(descriptionInput).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await descriptionInput.fill(description);
  }

  async submitNewCandidate(description: string): Promise<void> {
    await this.fillCandidateDescription(description);
    const submitButton = this.page.getByTestId('vote-submit-candidate-button');
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await submitButton.click();

    // Wait for candidate submission API call
    await waitForApiResponse(this.page, /\/api\/.*\/candidate/, { timeout: TIMEOUTS.LONG });
  }

  // Assertions
  async expectCandidatesVisible(): Promise<void> {
    await retryAssertion(async () => {
      const candidatesContainer = this.page.getByTestId('vote-candidates-list');
      await expect(candidatesContainer).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      const candidates = this.page.getByTestId(/^vote-candidate-/);
      await expect(candidates.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectCandidateDescription(candidateId: string, description: string): Promise<void> {
    await retryAssertion(async () => {
      const candidateElement = this.page.getByTestId(`vote-candidate-${candidateId}`);
      await expect(candidateElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await expect(candidateElement).toContainText(description);
    });
  }

  async expectSuccessMessage(): Promise<void> {
    await retryAssertion(async () => {
      const successElement = this.page.getByTestId('vote-success-message');
      await expect(successElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });
  }

  async expectErrorMessage(message: string): Promise<void> {
    await retryAssertion(async () => {
      const errorElement = this.page.getByTestId('vote-error-message');
      await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await expect(errorElement).toContainText(message);
    });
  }

  async expectCandidateInList(description: string): Promise<void> {
    await retryAssertion(async () => {
      const candidatesContainer = this.page.getByTestId('vote-candidates-list');
      await expect(candidatesContainer).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await expect(candidatesContainer).toContainText(description);
    });
  }
}
