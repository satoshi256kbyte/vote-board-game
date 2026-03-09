/**
 * Example usage of VoteButton component
 *
 * This file demonstrates how to integrate the VoteButton component
 * into a candidate card or candidate list.
 */

import { VoteButton } from './vote-button';

/**
 * Example 1: Basic usage in a candidate card
 */
export function CandidateCardExample() {
  const handleVoteSuccess = () => {
    // Refresh candidate list to show updated vote counts
    console.log('Vote successful, refreshing data...');
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-xl font-bold">D3</h3>
      <p className="text-gray-700 mt-2">この手は中央を制圧する重要な一手です。</p>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-600">投票数: 42</span>
        <span className="text-sm text-gray-600">投稿者: AI</span>
      </div>

      {/* Vote Button */}
      <div className="mt-4">
        <VoteButton
          candidateId="candidate-123"
          gameId="game-456"
          turnNumber={5}
          isAuthenticated={true}
          onVoteSuccess={handleVoteSuccess}
        />
      </div>
    </div>
  );
}

/**
 * Example 2: Vote button when user has already voted for another candidate
 */
export function CandidateCardWithVoteChangeExample() {
  const handleVoteSuccess = () => {
    console.log('Vote changed successfully');
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-xl font-bold">E5</h3>
      <p className="text-gray-700 mt-2">攻撃的な手で相手の陣地を削ります。</p>

      {/* Vote Change Button */}
      <div className="mt-4">
        <VoteButton
          candidateId="candidate-456"
          gameId="game-456"
          turnNumber={5}
          isAuthenticated={true}
          currentVotedCandidateId="candidate-123" // User voted for another candidate
          onVoteSuccess={handleVoteSuccess}
        />
      </div>
    </div>
  );
}

/**
 * Example 3: Vote button for unauthenticated user
 */
export function CandidateCardUnauthenticatedExample() {
  const handleVoteSuccess = () => {
    console.log('This should not be called for unauthenticated users');
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-xl font-bold">F4</h3>
      <p className="text-gray-700 mt-2">守備的な手で安定を図ります。</p>

      {/* Disabled button for unauthenticated users */}
      <div className="mt-4">
        <VoteButton
          candidateId="candidate-789"
          gameId="game-456"
          turnNumber={5}
          isAuthenticated={false} // User not logged in
          onVoteSuccess={handleVoteSuccess}
        />
      </div>
    </div>
  );
}

/**
 * Example 4: Vote button when user has already voted for this candidate
 * (Button will not be rendered)
 */
export function CandidateCardAlreadyVotedExample() {
  const handleVoteSuccess = () => {
    console.log('This should not be called');
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-xl font-bold">C6</h3>
      <p className="text-gray-700 mt-2">バランスの取れた手です。</p>

      {/* Vote Status Indicator instead of button */}
      <div className="mt-4">
        <VoteButton
          candidateId="candidate-123"
          gameId="game-456"
          turnNumber={5}
          isAuthenticated={true}
          currentVotedCandidateId="candidate-123" // User voted for THIS candidate
          onVoteSuccess={handleVoteSuccess}
        />
        {/* Button will not render, show vote status indicator instead */}
        <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm font-medium">
          ✓ 投票済み
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Integration with candidate list
 */
export function CandidateListExample() {
  const candidates = [
    { id: 'candidate-1', position: 'D3', description: '中央制圧', voteCount: 42 },
    { id: 'candidate-2', position: 'E5', description: '攻撃的', voteCount: 38 },
    { id: 'candidate-3', position: 'F4', description: '守備的', voteCount: 25 },
  ];

  const currentVotedCandidateId = 'candidate-1';
  const isAuthenticated = true;

  const handleVoteSuccess = () => {
    // Refresh candidate list
    console.log('Refreshing candidate list...');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {candidates.map((candidate) => (
        <div key={candidate.id} className="border rounded-lg p-4">
          <h3 className="text-xl font-bold">{candidate.position}</h3>
          <p className="text-gray-700 mt-2">{candidate.description}</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">投票数: {candidate.voteCount}</span>
          </div>

          {/* Vote Button or Status */}
          <div className="mt-4">
            {currentVotedCandidateId === candidate.id ? (
              <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm font-medium text-center">
                ✓ 投票済み
              </div>
            ) : (
              <VoteButton
                candidateId={candidate.id}
                gameId="game-456"
                turnNumber={5}
                isAuthenticated={isAuthenticated}
                currentVotedCandidateId={currentVotedCandidateId}
                onVoteSuccess={handleVoteSuccess}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
