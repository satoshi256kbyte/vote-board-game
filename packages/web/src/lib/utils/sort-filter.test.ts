import { describe, it, expect } from 'vitest';
import { sortCandidates, filterCandidates } from './sort-filter';
import type { Candidate } from './sort-filter';

describe('sortCandidates', () => {
  const mockCandidates: Candidate[] = [
    {
      id: '1',
      voteCount: 10,
      createdAt: '2024-01-01T10:00:00Z',
      createdBy: 'ai',
    },
    {
      id: '2',
      voteCount: 5,
      createdAt: '2024-01-01T12:00:00Z',
      createdBy: 'user',
    },
    {
      id: '3',
      voteCount: 15,
      createdAt: '2024-01-01T09:00:00Z',
      createdBy: 'ai',
    },
  ];

  describe('votes sorting', () => {
    it('should sort by votes in descending order', () => {
      const result = sortCandidates(mockCandidates, 'votes', 'desc');

      expect(result[0].id).toBe('3'); // 15 votes
      expect(result[1].id).toBe('1'); // 10 votes
      expect(result[2].id).toBe('2'); // 5 votes
    });

    it('should sort by votes in ascending order', () => {
      const result = sortCandidates(mockCandidates, 'votes', 'asc');

      expect(result[0].id).toBe('2'); // 5 votes
      expect(result[1].id).toBe('1'); // 10 votes
      expect(result[2].id).toBe('3'); // 15 votes
    });
  });

  describe('createdAt sorting', () => {
    it('should sort by createdAt in descending order (newest first)', () => {
      const result = sortCandidates(mockCandidates, 'createdAt', 'desc');

      expect(result[0].id).toBe('2'); // 12:00
      expect(result[1].id).toBe('1'); // 10:00
      expect(result[2].id).toBe('3'); // 09:00
    });

    it('should sort by createdAt in ascending order (oldest first)', () => {
      const result = sortCandidates(mockCandidates, 'createdAt', 'asc');

      expect(result[0].id).toBe('3'); // 09:00
      expect(result[1].id).toBe('1'); // 10:00
      expect(result[2].id).toBe('2'); // 12:00
    });
  });

  describe('edge cases', () => {
    it('should return empty array when input is empty', () => {
      const result = sortCandidates([], 'votes', 'desc');

      expect(result).toEqual([]);
    });

    it('should handle single candidate', () => {
      const singleCandidate = [mockCandidates[0]];
      const result = sortCandidates(singleCandidate, 'votes', 'desc');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should not mutate original array', () => {
      const original = [...mockCandidates];
      sortCandidates(mockCandidates, 'votes', 'desc');

      expect(mockCandidates).toEqual(original);
    });

    it('should handle candidates with same vote count', () => {
      const sameCandidates: Candidate[] = [
        { id: '1', voteCount: 10, createdAt: '2024-01-01T10:00:00Z', createdBy: 'ai' },
        { id: '2', voteCount: 10, createdAt: '2024-01-01T11:00:00Z', createdBy: 'user' },
      ];

      const result = sortCandidates(sameCandidates, 'votes', 'desc');

      expect(result).toHaveLength(2);
      // Order should be stable for equal values
    });

    it('should handle candidates with same createdAt', () => {
      const sameCandidates: Candidate[] = [
        { id: '1', voteCount: 10, createdAt: '2024-01-01T10:00:00Z', createdBy: 'ai' },
        { id: '2', voteCount: 5, createdAt: '2024-01-01T10:00:00Z', createdBy: 'user' },
      ];

      const result = sortCandidates(sameCandidates, 'createdAt', 'asc');

      expect(result).toHaveLength(2);
    });
  });
});

describe('filterCandidates', () => {
  const mockCandidates: Candidate[] = [
    {
      id: '1',
      voteCount: 10,
      createdAt: '2024-01-01T10:00:00Z',
      createdBy: 'ai',
    },
    {
      id: '2',
      voteCount: 5,
      createdAt: '2024-01-01T12:00:00Z',
      createdBy: 'user',
    },
    {
      id: '3',
      voteCount: 15,
      createdAt: '2024-01-01T09:00:00Z',
      createdBy: 'ai',
    },
    {
      id: '4',
      voteCount: 8,
      createdAt: '2024-01-01T11:00:00Z',
      createdBy: 'user',
    },
  ];

  describe('all filter', () => {
    it('should return all candidates when filter is "all"', () => {
      const result = filterCandidates(mockCandidates, 'all');

      expect(result).toHaveLength(4);
      expect(result).toEqual(mockCandidates);
    });
  });

  describe('my-vote filter', () => {
    it('should return only voted candidate when filter is "my-vote"', () => {
      const result = filterCandidates(mockCandidates, 'my-vote', '2');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should return empty array when voted candidate not found', () => {
      const result = filterCandidates(mockCandidates, 'my-vote', 'non-existent');

      expect(result).toEqual([]);
    });

    it('should return empty array when votedCandidateId is undefined', () => {
      const result = filterCandidates(mockCandidates, 'my-vote');

      expect(result).toEqual([]);
    });
  });

  describe('ai filter', () => {
    it('should return only AI-created candidates when filter is "ai"', () => {
      const result = filterCandidates(mockCandidates, 'ai');

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.createdBy === 'ai')).toBe(true);
      expect(result.map((c) => c.id)).toEqual(['1', '3']);
    });

    it('should return empty array when no AI candidates exist', () => {
      const userOnlyCandidates: Candidate[] = [
        { id: '1', voteCount: 10, createdAt: '2024-01-01T10:00:00Z', createdBy: 'user' },
      ];

      const result = filterCandidates(userOnlyCandidates, 'ai');

      expect(result).toEqual([]);
    });
  });

  describe('user filter', () => {
    it('should return only user-created candidates when filter is "user"', () => {
      const result = filterCandidates(mockCandidates, 'user');

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.createdBy === 'user')).toBe(true);
      expect(result.map((c) => c.id)).toEqual(['2', '4']);
    });

    it('should return empty array when no user candidates exist', () => {
      const aiOnlyCandidates: Candidate[] = [
        { id: '1', voteCount: 10, createdAt: '2024-01-01T10:00:00Z', createdBy: 'ai' },
      ];

      const result = filterCandidates(aiOnlyCandidates, 'user');

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array when input is empty', () => {
      const result = filterCandidates([], 'all');

      expect(result).toEqual([]);
    });

    it('should not mutate original array', () => {
      const original = [...mockCandidates];
      filterCandidates(mockCandidates, 'ai');

      expect(mockCandidates).toEqual(original);
    });
  });
});
