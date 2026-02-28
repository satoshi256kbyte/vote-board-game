import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VotingPage } from './voting-page';
import type { Page } from '@playwright/test';

describe('VotingPage', () => {
  let mockPage: Page;
  let votingPage: VotingPage;

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForLoadState: vi.fn().mockResolvedValue(undefined),
      getByTestId: vi.fn(),
    } as unknown as Page;

    votingPage = new VotingPage(mockPage);
  });

  describe('goto', () => {
    it('should navigate to voting page', async () => {
      await votingPage.goto('game-123');

      expect(mockPage.goto).toHaveBeenCalledWith('/games/game-123/vote');
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle');
    });
  });

  describe('selectCandidate', () => {
    it('should click on candidate', async () => {
      const mockElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.selectCandidate('candidate-1');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidate-candidate-1');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('submitVote', () => {
    it('should click submit button', async () => {
      const mockElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.submitVote();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-submit-button');
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('vote', () => {
    it('should select candidate and submit', async () => {
      const mockElement = {
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.vote('candidate-1');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidate-candidate-1');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-submit-button');
    });
  });

  describe('fillCandidateDescription', () => {
    it('should fill description input', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.fillCandidateDescription('Test description');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidate-description-input');
      expect(mockElement.fill).toHaveBeenCalledWith('Test description');
    });
  });

  describe('submitNewCandidate', () => {
    it('should fill description and submit', async () => {
      const mockElement = {
        fill: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.submitNewCandidate('New candidate');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidate-description-input');
      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-submit-candidate-button');
    });
  });

  describe('expectCandidatesVisible', () => {
    it('should verify candidates list is visible', async () => {
      const mockContainer = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
      };
      const mockCandidates = {
        first: vi.fn().mockReturnValue({
          toBeVisible: vi.fn().mockResolvedValue(undefined),
        }),
      };

      vi.mocked(mockPage.getByTestId).mockImplementation((testId) => {
        if (testId === 'vote-candidates-list') return mockContainer as any;
        return mockCandidates as any;
      });

      await votingPage.expectCandidatesVisible();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidates-list');
    });
  });

  describe('expectCandidateDescription', () => {
    it('should verify candidate description', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
        toContainText: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.expectCandidateDescription('candidate-1', 'Test description');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidate-candidate-1');
    });
  });

  describe('expectSuccessMessage', () => {
    it('should verify success message is visible', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.expectSuccessMessage();

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-success-message');
    });
  });

  describe('expectErrorMessage', () => {
    it('should verify error message with text', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
        toContainText: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.expectErrorMessage('Error occurred');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-error-message');
    });
  });

  describe('expectCandidateInList', () => {
    it('should verify candidate is in list', async () => {
      const mockElement = {
        toBeVisible: vi.fn().mockResolvedValue(undefined),
        toContainText: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(mockPage.getByTestId).mockReturnValue(mockElement as any);

      await votingPage.expectCandidateInList('New candidate');

      expect(mockPage.getByTestId).toHaveBeenCalledWith('vote-candidates-list');
    });
  });
});
