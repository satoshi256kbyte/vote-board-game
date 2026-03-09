# CandidateListSection Component

Server Component that fetches initial candidate data and vote status, then renders the candidate list.

## Purpose

- Fetch initial candidate data server-side for optimal performance
- Fetch initial vote status for authenticated users
- Handle errors gracefully (404, network errors)
- Pass data to CandidateList component (Task 9.1)

## Requirements

Validates: Requirements 1.2, 5.5, 8.1, 8.5, 11.2

## Props

```typescript
interface CandidateListSectionProps {
  gameId: string; // The game ID (UUID v4)
  turnNumber: number; // The current turn number
  isAuthenticated: boolean; // Whether the user is authenticated
}
```

## Usage

### Integration with Game Detail Page (Task 10.2)

The game detail page will need to be converted to a Server Component or use a hybrid approach:

```tsx
// Option 1: Convert page to Server Component
export default async function GameDetailPage({ params }: { params: { gameId: string } }) {
  const game = await fetchGame(params.gameId);
  const session = await getServerSession(); // Get auth status

  return (
    <div>
      {/* Board and game info */}
      <Board boardState={game.boardState} />

      {/* Candidate list section */}
      <CandidateListSection
        gameId={params.gameId}
        turnNumber={game.currentTurn}
        isAuthenticated={!!session}
      />
    </div>
  );
}

// Option 2: Use Server Component within Client Component
// In page.tsx (Client Component):
import { CandidateListSection } from './_components/candidate-list-section';

export default function GameDetailPage() {
  // ... existing client-side logic

  return (
    <div>
      {/* Existing content */}

      {/* Add candidate list section */}
      {game && (
        <CandidateListSection
          gameId={game.gameId}
          turnNumber={game.currentTurn}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
}
```

## Features

### Server-Side Data Fetching

- Fetches candidates using `getCandidates()` API
- Fetches vote status using `getVoteStatus()` API (only if authenticated)
- Optimizes initial page load with server-side rendering

### Error Handling

- **404 Error**: Displays "対局が見つかりません"
- **Network Error**: Displays "ネットワークエラーが発生しました"
- **Generic Error**: Displays "候補の取得に失敗しました"
- **Vote Status Error**: Fails gracefully, still shows candidates

### States

1. **Loading**: Handled by Next.js Suspense boundaries
2. **Error**: Red error message with error details
3. **Empty**: Gray box with "まだ候補がありません" message
4. **Success**: Displays candidates with vote status

## Current Implementation

The component currently renders a temporary placeholder that shows:

- Number of candidates loaded
- Vote status (if authenticated and voted)
- Individual candidate cards with basic information

This will be replaced with the `CandidateList` component from Task 9.1.

## Testing

Unit tests are provided in `candidate-list-section.test.tsx`:

- ✅ Renders candidates successfully when authenticated
- ✅ Renders candidates without vote status when not authenticated
- ✅ Renders empty state when no candidates exist
- ✅ Renders error state when candidates fetch fails
- ✅ Renders 404 error when game is not found
- ✅ Renders network error message
- ✅ Handles vote status fetch failure gracefully
- ✅ Displays candidate metadata correctly
- ✅ Displays closed status correctly

Run tests:

```bash
cd packages/web
pnpm test candidate-list-section.test.tsx --run
```

## Next Steps

1. **Task 9.1**: Implement CandidateList Client Component
2. **Task 10.2**: Integrate CandidateListSection into game detail page
3. Replace temporary placeholder with actual CandidateList component

## API Dependencies

- `getCandidates(gameId, turnNumber)` - From `@/lib/api/candidates`
- `getVoteStatus(gameId, turnNumber)` - From `@/lib/api/candidates`

## Type Dependencies

- `Candidate` interface - From `@/lib/api/candidates`
- `VoteStatus` interface - From `@/lib/api/candidates`
