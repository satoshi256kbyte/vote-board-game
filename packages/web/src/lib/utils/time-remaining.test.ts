import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateTimeRemaining } from './time-remaining';

describe('calculateTimeRemaining', () => {
  beforeEach(() => {
    // Mock current time to 2024-01-01 12:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('expired deadline', () => {
    it('should return expired status when deadline is in the past', () => {
      const deadline = '2024-01-01T11:00:00Z'; // 1 hour ago
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(true);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.displayText).toBe('締切済み');
      expect(result.colorClass).toBe('text-gray-500');
    });

    it('should return expired status when deadline is exactly now', () => {
      const deadline = '2024-01-01T12:00:00Z'; // exactly now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(true);
    });
  });

  describe('less than 1 hour remaining', () => {
    it('should return red color when 30 minutes remaining', () => {
      const deadline = '2024-01-01T12:30:00Z'; // 30 minutes from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(30);
      expect(result.displayText).toBe('あと30分');
      expect(result.colorClass).toBe('text-red-500');
    });

    it('should return red color when 59 minutes remaining', () => {
      const deadline = '2024-01-01T12:59:00Z'; // 59 minutes from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(59);
      expect(result.displayText).toBe('あと59分');
      expect(result.colorClass).toBe('text-red-500');
    });

    it('should return red color when 1 minute remaining', () => {
      const deadline = '2024-01-01T12:01:00Z'; // 1 minute from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(1);
      expect(result.displayText).toBe('あと1分');
      expect(result.colorClass).toBe('text-red-500');
    });
  });

  describe('less than 24 hours remaining', () => {
    it('should return orange color when 1 hour remaining', () => {
      const deadline = '2024-01-01T13:00:00Z'; // 1 hour from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(1);
      expect(result.minutes).toBe(0);
      expect(result.displayText).toBe('あと1時間');
      expect(result.colorClass).toBe('text-orange-500');
    });

    it('should return orange color when 2 hours 30 minutes remaining', () => {
      const deadline = '2024-01-01T14:30:00Z'; // 2.5 hours from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(30);
      expect(result.displayText).toBe('あと2時間30分');
      expect(result.colorClass).toBe('text-orange-500');
    });

    it('should return orange color when 23 hours 59 minutes remaining', () => {
      const deadline = '2024-01-02T11:59:00Z'; // 23:59 from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(23);
      expect(result.minutes).toBe(59);
      expect(result.displayText).toBe('あと23時間59分');
      expect(result.colorClass).toBe('text-orange-500');
    });
  });

  describe('24 hours or more remaining', () => {
    it('should return gray color when exactly 24 hours remaining', () => {
      const deadline = '2024-01-02T12:00:00Z'; // 24 hours from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(24);
      expect(result.minutes).toBe(0);
      expect(result.displayText).toBe('あと24時間');
      expect(result.colorClass).toBe('text-gray-700');
    });

    it('should return gray color when 48 hours remaining', () => {
      const deadline = '2024-01-03T12:00:00Z'; // 48 hours from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(48);
      expect(result.minutes).toBe(0);
      expect(result.displayText).toBe('あと48時間');
      expect(result.colorClass).toBe('text-gray-700');
    });

    it('should return gray color when 25 hours 15 minutes remaining', () => {
      const deadline = '2024-01-02T13:15:00Z'; // 25:15 from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBe(25);
      expect(result.minutes).toBe(15);
      expect(result.displayText).toBe('あと25時間15分');
      expect(result.colorClass).toBe('text-gray-700');
    });
  });

  describe('display text formatting', () => {
    it('should show only minutes when hours is 0', () => {
      const deadline = '2024-01-01T12:45:00Z'; // 45 minutes from now
      const result = calculateTimeRemaining(deadline);

      expect(result.displayText).toBe('あと45分');
    });

    it('should show hours and minutes when both are present', () => {
      const deadline = '2024-01-01T14:30:00Z'; // 2:30 from now
      const result = calculateTimeRemaining(deadline);

      expect(result.displayText).toBe('あと2時間30分');
    });

    it('should show only hours when minutes is 0', () => {
      const deadline = '2024-01-01T15:00:00Z'; // 3 hours from now
      const result = calculateTimeRemaining(deadline);

      expect(result.displayText).toBe('あと3時間');
    });
  });

  describe('edge cases', () => {
    it('should handle deadline with seconds', () => {
      const deadline = '2024-01-01T12:30:45Z'; // 30 minutes 45 seconds from now
      const result = calculateTimeRemaining(deadline);

      // Seconds should be truncated
      expect(result.minutes).toBe(30);
      expect(result.displayText).toBe('あと30分');
    });

    it('should handle very long deadline', () => {
      const deadline = '2024-12-31T12:00:00Z'; // ~365 days from now
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(false);
      expect(result.hours).toBeGreaterThan(8000); // ~365 * 24
      expect(result.colorClass).toBe('text-gray-700');
    });

    it('should handle deadline just 1 second in the past', () => {
      const deadline = '2024-01-01T11:59:59Z'; // 1 second ago
      const result = calculateTimeRemaining(deadline);

      expect(result.isExpired).toBe(true);
      expect(result.displayText).toBe('締切済み');
    });
  });
});
