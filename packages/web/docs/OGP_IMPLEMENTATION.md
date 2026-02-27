# OGP Image Generation Implementation

## Overview

This document describes the OGP (Open Graph Protocol) image generation implementation for the Vote Board Game application. OGP images are dynamically generated for game and candidate detail pages to provide rich social media previews.

## Architecture Change

### Static Export Removal

The application previously used Next.js static export (`output: 'export'`), which does not support API routes. To enable dynamic OGP image generation, we removed the static export constraint from `next.config.ts`.

**Before:**

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@vote-board-game/shared'],
};
```

**After:**

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vote-board-game/shared'],
};
```

### Deployment Implications

- **Previous**: Static files deployed to S3 + CloudFront
- **Current**: Requires a platform that supports Next.js API routes (e.g., Vercel, AWS Amplify, or custom Node.js server)
- **Recommendation**: Deploy to Vercel for seamless support of Edge Runtime and @vercel/og

## Implementation

### Dependencies

- `@vercel/og` (v0.9.0): Official Vercel library for generating OGP images using Edge Runtime

### API Routes

#### 1. Game OGP Image (`/api/og/game/[gameId]`)

**Location**: `packages/web/src/app/api/og/game/[gameId]/route.tsx`

**Query Parameters**:

- `turn`: Current turn number
- `black`: Black disc count
- `white`: White disc count
- `status`: Game status (ACTIVE/FINISHED)

**Example URL**:

```
/api/og/game/abc123?turn=5&black=10&white=8&status=ACTIVE
```

**Features**:

- Displays game title and turn number
- Shows disc counts with visual indicators
- Indicates game status (finished games show "対局終了")
- 1200x630px image optimized for social media

#### 2. Candidate OGP Image (`/api/og/candidate/[candidateId]`)

**Location**: `packages/web/src/app/api/og/candidate/[candidateId]/route.tsx`

**Query Parameters**:

- `position`: Move position (e.g., "D3")
- `votes`: Vote count
- `user`: Username of poster
- `desc`: Description (truncated to 100 characters)

**Example URL**:

```
/api/og/candidate/xyz789?position=D3&votes=5&user=Player1&desc=Good%20move
```

**Features**:

- Displays move position prominently
- Shows vote count and username
- Includes candidate description (truncated if too long)
- 1200x630px image optimized for social media

### Metadata Generation

#### Game Detail Page

**Location**: `packages/web/src/app/games/[gameId]/page.tsx`

The `generateMetadata` function:

1. Fetches game data from the API
2. Calculates disc counts
3. Generates OGP image URL with query parameters
4. Returns metadata for Open Graph and Twitter Card

**Example Metadata**:

```typescript
{
  title: "オセロ対局 #abc123 - ターン5",
  description: "進行中の対局。黒: 10, 白: 8",
  openGraph: {
    images: [{ url: "/api/og/game/abc123?turn=5&black=10&white=8&status=ACTIVE" }]
  }
}
```

#### Candidate Detail Page

**Location**: `packages/web/src/app/games/[gameId]/candidates/[candidateId]/page.tsx`

The `generateMetadata` function:

1. Fetches candidate data from the API
2. Generates OGP image URL with query parameters
3. Returns metadata for Open Graph and Twitter Card

**Example Metadata**:

```typescript
{
  title: "次の一手候補: D3",
  description: "この手は角を取る重要な一手です",
  openGraph: {
    images: [{ url: "/api/og/candidate/xyz789?position=D3&votes=5&user=Player1" }]
  }
}
```

### Environment Variables

**Required**:

- `NEXT_PUBLIC_APP_URL`: Base URL of the application (used for generating absolute OGP image URLs)

**Example** (`.env.local`):

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production** (`.env.production`):

```env
NEXT_PUBLIC_APP_URL=https://vote-board-game.com
```

## Testing

### Unit Tests

#### Game OGP Route Tests

**Location**: `packages/web/src/app/api/og/game/[gameId]/route.test.tsx`

**Coverage**:

- ✓ Generates OGP image with game data
- ✓ Handles missing query parameters with defaults
- ✓ Includes game ID in the image
- ✓ Handles finished game status

#### Candidate OGP Route Tests

**Location**: `packages/web/src/app/api/og/candidate/[candidateId]/route.test.tsx`

**Coverage**:

- ✓ Generates OGP image with candidate data
- ✓ Handles missing query parameters with defaults
- ✓ Truncates long descriptions
- ✓ Handles Japanese characters in description
- ✓ Includes candidate ID in the image

### Running Tests

```bash
cd packages/web
pnpm test -- src/app/api/og --run
```

## Social Media Debugging

### Testing OGP Images

Use these tools to test OGP images before deployment:

1. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

### Example Test URLs

**Game Detail**:

```
https://your-domain.com/games/abc123
```

**Candidate Detail**:

```
https://your-domain.com/games/abc123/candidates/xyz789
```

## Future Enhancements

### Board Rendering

Currently, OGP images show placeholder content. Future enhancements could include:

1. **SVG Board Rendering**: Use the `generateBoardSVG` helper (already created in `packages/web/src/lib/ogp/board-svg.tsx`) to render actual board states
2. **Highlighted Moves**: Show candidate moves with highlighting on the board
3. **Custom Fonts**: Add Japanese fonts for better text rendering
4. **Caching**: Implement caching strategy for generated images

### Implementation Example

```typescript
import { generateBoardSVG } from '@/lib/ogp/board-svg';

// In the OGP route
const boardSVG = generateBoardSVG({
  boardState: game.boardState,
  width: 400,
  height: 400,
});

// Embed SVG in ImageResponse
<div dangerouslySetInnerHTML={{ __html: boardSVG }} />
```

## Troubleshooting

### Issue: OGP images not updating

**Solution**: Clear social media cache using the debugging tools listed above.

### Issue: Images not loading in production

**Solution**: Verify `NEXT_PUBLIC_APP_URL` is set correctly in production environment variables.

### Issue: Japanese text not rendering correctly

**Solution**: Add custom font support to @vercel/og (requires font files and configuration).

## References

- [@vercel/og Documentation](https://vercel.com/docs/functions/edge-functions/og-image-generation)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
