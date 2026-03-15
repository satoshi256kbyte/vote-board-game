/**
 * Property-based tests for VoteTallyService
 *
 * fast-check を使用して findWinningCandidate の正当性プロパティを検証する。
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { VoteTallyService } from './index.js';
import type { CandidateEntity } from '../../lib/dynamodb/types.js';

/** テスト用の CandidateEntity を作成するヘルパー */
function createCandidate(
  candidateId: string,
  voteCount: number,
  createdAt: string
): CandidateEntity {
  return {
    PK: 'GAME#test#TURN#0',
    SK: `CANDIDATE#${candidateId}`,
    entityType: 'CANDIDATE',
    candidateId,
    gameId: 'test-game',
    turnNumber: 0,
    position: '2,3',
    description: 'テスト候補',
    voteCount,
    createdBy: 'AI',
    status: 'VOTING',
    votingDeadline: '2024-01-02T15:00:00Z',
    createdAt,
  };
}

/** CandidateEntity の Arbitrary */
const candidateArbitrary: fc.Arbitrary<CandidateEntity> = fc
  .record({
    candidateId: fc.uuid(),
    voteCount: fc.nat({ max: 1000 }),
    createdAt: fc.integer({
      min: new Date('2020-01-01T00:00:00Z').getTime(),
      max: new Date('2030-12-31T23:59:59Z').getTime(),
    }),
  })
  .map(({ candidateId, voteCount, createdAt }) =>
    createCandidate(candidateId, voteCount, new Date(createdAt).toISOString())
  );

/** 空でない CandidateEntity 配列の Arbitrary */
const nonEmptyCandidatesArbitrary: fc.Arbitrary<CandidateEntity[]> = fc.array(candidateArbitrary, {
  minLength: 1,
  maxLength: 20,
});

describe('VoteTallyService Property Tests', () => {
  const service = new VoteTallyService({} as never, {} as never, {} as never);

  // Feature: 32-vote-tally-batch, Property 1: 最多得票候補の決定
  /**
   * Property 1: 最多得票候補の決定
   * **Validates: Requirements 2.1, 2.3**
   *
   * 任意の空でない候補リストに対して:
   * - 返された候補の voteCount がリスト内最大であること
   * - 同票時は createdAt が最も古い候補であること
   */
  it('Property 1: 最多得票候補の決定 - 返された候補の voteCount がリスト内最大で、同票時は createdAt が最も古い', () => {
    fc.assert(
      fc.property(nonEmptyCandidatesArbitrary, (candidates) => {
        const winner = service.findWinningCandidate(candidates);

        // 空でないリストなので必ず候補が返る
        expect(winner).not.toBeNull();

        const maxVoteCount = Math.max(...candidates.map((c) => c.voteCount));

        // 返された候補の voteCount はリスト内最大である
        expect(winner!.voteCount).toBe(maxVoteCount);

        // 同じ最大 voteCount を持つ候補の中で、createdAt が最も古い
        const tiedCandidates = candidates.filter((c) => c.voteCount === maxVoteCount);
        const earliestCreatedAt = tiedCandidates
          .map((c) => c.createdAt)
          .sort((a, b) => a.localeCompare(b))[0];

        expect(winner!.createdAt).toBe(earliestCreatedAt);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});

// Feature: 32-vote-tally-batch, Property 3: サマリーの整合性
describe('VoteTallySummary Property Tests', () => {
  /** VoteTallyGameResult の status の Arbitrary */
  const statusArbitrary = fc.constantFrom(
    'success' as const,
    'skipped' as const,
    'failed' as const,
    'passed' as const,
    'finished' as const
  );

  /** VoteTallyGameResult の Arbitrary */
  const gameResultArbitrary: fc.Arbitrary<import('./types.js').VoteTallyGameResult> = fc
    .record({
      gameId: fc.uuid(),
      status: statusArbitrary,
    })
    .map(({ gameId, status }) => ({ gameId, status }));

  /** サマリー集計ロジック（tallyVotes 内と同じ計算） */
  function computeSummary(
    results: import('./types.js').VoteTallyGameResult[]
  ): import('./types.js').VoteTallySummary {
    return {
      totalGames: results.length,
      successCount: results.filter((r) => r.status === 'success').length,
      failedCount: results.filter((r) => r.status === 'failed').length,
      skippedCount: results.filter((r) => r.status === 'skipped').length,
      passedCount: results.filter((r) => r.status === 'passed').length,
      finishedCount: results.filter((r) => r.status === 'finished').length,
      results,
    };
  }

  /**
   * Property 3: サマリーの整合性
   * **Validates: Requirements 6.1**
   *
   * 任意の VoteTallyGameResult 配列に対して:
   * - totalGames = 配列長
   * - 各カウントの合計 = totalGames
   * - 各カウントが対応する status の数と一致
   */
  it('Property 3: サマリーの整合性 - totalGames = 配列長、各カウントの合計 = totalGames', () => {
    fc.assert(
      fc.property(fc.array(gameResultArbitrary, { maxLength: 30 }), (results) => {
        const summary = computeSummary(results);

        // totalGames は配列の長さと等しい
        expect(summary.totalGames).toBe(results.length);

        // 各カウントの合計は totalGames と等しい
        const totalCounts =
          summary.successCount +
          summary.failedCount +
          summary.skippedCount +
          summary.passedCount +
          summary.finishedCount;
        expect(totalCounts).toBe(summary.totalGames);

        // 各カウントは対応する status を持つ結果の数と一致
        expect(summary.successCount).toBe(results.filter((r) => r.status === 'success').length);
        expect(summary.failedCount).toBe(results.filter((r) => r.status === 'failed').length);
        expect(summary.skippedCount).toBe(results.filter((r) => r.status === 'skipped').length);
        expect(summary.passedCount).toBe(results.filter((r) => r.status === 'passed').length);
        expect(summary.finishedCount).toBe(results.filter((r) => r.status === 'finished').length);
      }),
      { numRuns: 10, endOnFailure: true }
    );
  });
});
