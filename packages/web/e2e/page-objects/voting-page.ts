import { type Page, expect } from '@playwright/test';

export class VotingPage {
    constructor(private page: Page) { }

    // Navigation
    async goto(gameId: string): Promise<void> {
        await this.page.goto(`/games/${gameId}/vote`);
        await this.page.waitForLoadState('networkidle');
    }

    // Actions
    async selectCandidate(candidateId: string): Promise<void> {
        await this.page.getByTestId(`vote-candidate-${candidateId}`).click();
    }

    async submitVote(): Promise<void> {
        await this.page.getByTestId('vote-submit-button').click();
    }

    async vote(candidateId: string): Promise<void> {
        await this.selectCandidate(candidateId);
        await this.submitVote();
    }

    async fillCandidateDescription(description: string): Promise<void> {
        await this.page
            .getByTestId('vote-candidate-description-input')
            .fill(description);
    }

    async submitNewCandidate(description: string): Promise<void> {
        await this.fillCandidateDescription(description);
        await this.page.getByTestId('vote-submit-candidate-button').click();
    }

    // Assertions
    async expectCandidatesVisible(): Promise<void> {
        const candidatesContainer = this.page.getByTestId('vote-candidates-list');
        await expect(candidatesContainer).toBeVisible();

        const candidates = this.page.getByTestId(/^vote-candidate-/);
        await expect(candidates.first()).toBeVisible();
    }

    async expectCandidateDescription(
        candidateId: string,
        description: string
    ): Promise<void> {
        const candidateElement = this.page.getByTestId(`vote-candidate-${candidateId}`);
        await expect(candidateElement).toBeVisible();
        await expect(candidateElement).toContainText(description);
    }

    async expectSuccessMessage(): Promise<void> {
        const successElement = this.page.getByTestId('vote-success-message');
        await expect(successElement).toBeVisible();
    }

    async expectErrorMessage(message: string): Promise<void> {
        const errorElement = this.page.getByTestId('vote-error-message');
        await expect(errorElement).toBeVisible();
        await expect(errorElement).toContainText(message);
    }

    async expectCandidateInList(description: string): Promise<void> {
        const candidatesContainer = this.page.getByTestId('vote-candidates-list');
        await expect(candidatesContainer).toBeVisible();
        await expect(candidatesContainer).toContainText(description);
    }
}
