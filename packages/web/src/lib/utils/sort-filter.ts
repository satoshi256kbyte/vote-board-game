/**
 * ソート・フィルター関数
 * 次の一手候補のソートとフィルタリングを行う
 */

// Minimum Candidate interface for sorting and filtering
export interface CandidateBase {
  id: string;
  voteCount: number;
  createdAt: string;
  source: 'ai' | 'user';
}

export type SortBy = 'voteCount' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type Filter = 'all' | 'my-vote' | 'ai' | 'user';

/**
 * 候補をソートする
 *
 * @param candidates - ソート対象の候補配列
 * @param sortBy - ソート基準（'voteCount' または 'createdAt'）
 * @param sortOrder - ソート順（'asc' または 'desc'）
 * @returns ソート済みの新しい候補配列
 *
 * Preconditions:
 * - candidates is a valid array of Candidate objects
 * - sortBy is either 'voteCount' or 'createdAt'
 * - sortOrder is either 'asc' or 'desc'
 *
 * Postconditions:
 * - Returns a new sorted array without mutating the input
 * - When sortBy is 'voteCount', candidates are sorted by voteCount
 * - When sortBy is 'createdAt', candidates are sorted by createdAt timestamp
 * - When sortOrder is 'desc', higher values come first
 * - When sortOrder is 'asc', lower values come first
 */
export function sortCandidates<T extends CandidateBase>(
  candidates: T[],
  sortBy: SortBy,
  sortOrder: SortOrder
): T[] {
  const sorted = [...candidates].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'voteCount') {
      comparison = a.voteCount - b.voteCount;
    } else if (sortBy === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * 候補をフィルタリングする
 *
 * @param candidates - フィルタリング対象の候補配列
 * @param filter - フィルター条件（'all', 'my-vote', 'ai', 'user'）
 * @param votedCandidateId - ユーザーが投票した候補のID（'my-vote'フィルター時に必要）
 * @returns フィルタリング済みの新しい候補配列
 *
 * Preconditions:
 * - candidates is a valid array of Candidate objects
 * - filter is one of 'all', 'my-vote', 'ai', 'user'
 * - votedCandidateId is provided when filter is 'my-vote'
 *
 * Postconditions:
 * - Returns a new filtered array without mutating the input
 * - When filter is 'all', returns all candidates
 * - When filter is 'my-vote', returns only the candidate matching votedCandidateId
 * - When filter is 'ai', returns only candidates where source is 'ai'
 * - When filter is 'user', returns only candidates where source is 'user'
 */
export function filterCandidates<T extends CandidateBase>(
  candidates: T[],
  filter: Filter,
  votedCandidateId?: string
): T[] {
  if (filter === 'all') {
    return candidates;
  }

  if (filter === 'my-vote') {
    return candidates.filter((c) => c.id === votedCandidateId);
  }

  if (filter === 'ai') {
    return candidates.filter((c) => c.source === 'ai');
  }

  if (filter === 'user') {
    return candidates.filter((c) => c.source === 'user');
  }

  return candidates;
}
