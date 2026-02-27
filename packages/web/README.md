# Vote Board Game - Frontend

投票ボードゲームのフロントエンドアプリケーション。Next.js 16 (App Router) + React 19 + TypeScript で構築されています。

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **React**: React 19
- **TypeScript**: Strict mode
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **E2E Testing**: Playwright

## プロジェクト構造

```
packages/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── games/             # Game-related pages
│   │   │   ├── new/           # Game creation
│   │   │   └── [gameId]/      # Game detail and candidates
│   │   ├── login/             # Authentication pages
│   │   ├── register/
│   │   └── page.tsx           # Home page (game list)
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── board.tsx          # Othello board component
│   │   ├── candidate-card.tsx # Candidate display
│   │   ├── game-card.tsx      # Game summary card
│   │   ├── move-history.tsx   # Move history list
│   │   └── share-button.tsx   # Share functionality
│   ├── lib/                   # Utilities and services
│   │   ├── api/               # API client
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Business logic
│   │   └── utils.ts           # Utility functions
│   └── types/                 # TypeScript type definitions
├── e2e/                       # E2E tests
└── public/                    # Static assets
```

## 主要コンポーネント

### Board Component

オセロの盤面を表示するコンポーネント。表示専用モードとインタラクティブモードをサポート。

```tsx
import { Board } from '@/components/board';

// Display mode
<Board boardState={game.boardState} />

// Interactive mode
<Board
  boardState={game.boardState}
  onCellClick={(row, col) => handleCellClick(row, col)}
  highlightedCell={{ row: 3, col: 4 }}
/>
```

### CandidateCard Component

次の一手候補を表示し、投票機能を提供するコンポーネント。

```tsx
import { CandidateCard } from '@/components/candidate-card';

<CandidateCard
  candidate={candidate}
  isVoted={false}
  onVote={(candidateId) => handleVote(candidateId)}
/>;
```

### ShareButton Component

Web Share API を使用したシェア機能を提供。非対応ブラウザではクリップボードにコピー。

```tsx
import { ShareButton } from '@/components/share-button';

<ShareButton title="オセロ対局" text="この対局をチェック！" url="https://example.com/games/123" />;
```

## API Client

型安全な API クライアントを提供。

```tsx
import { fetchGames, fetchGame, createGame, vote } from '@/lib/api/client';

// Get games list
const { games, nextCursor } = await fetchGames({ status: 'ACTIVE' });

// Get game detail
const game = await fetchGame(gameId);

// Create new game
const newGame = await createGame({
  gameType: 'OTHELLO',
  aiSide: 'BLACK',
});

// Vote for candidate
await vote(gameId, candidateId);
```

## 認証

Cognito を使用した認証システム。

```tsx
import { useAuth } from '@/lib/hooks/use-auth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return <div>Welcome, {user?.username}</div>;
}
```

## 開発

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して必要な環境変数を設定
```

### 開発サーバー

```bash
pnpm dev
```

http://localhost:3000 でアプリケーションが起動します。

### ビルド

```bash
# 静的エクスポート
pnpm build

# ビルド結果は out/ ディレクトリに出力されます
```

### テスト

```bash
# ユニットテスト
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジ
pnpm test:coverage

# E2Eテスト
pnpm test:e2e
```

### Lint & Format

```bash
# ESLint
pnpm lint

# Prettier
pnpm format

# 型チェック
pnpm type-check
```

## 環境変数

`.env.local` に以下の環境変数を設定してください：

```bash
# API URL
NEXT_PUBLIC_API_URL=https://api.example.com

# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

## デプロイ

### S3 + CloudFront

```bash
# ビルド
pnpm build

# S3にアップロード
aws s3 sync out/ s3://your-bucket-name/ --delete

# CloudFront キャッシュをクリア
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## コーディング規約

### Server Components vs Client Components

- デフォルトは Server Components を使用
- 以下の場合のみ Client Components (`'use client'`) を使用：
  - インタラクティブな機能（onClick, onChange など）
  - React hooks（useState, useEffect など）
  - ブラウザ API（localStorage, navigator など）

### TypeScript

- strict mode を有効化
- `any` 型は使用しない
- 型定義は `types/` ディレクトリに配置

### スタイリング

- Tailwind CSS のユーティリティクラスを使用
- カスタムクラスは最小限に
- レスポンシブデザインを考慮（モバイルファースト）

### テスト

- すべてのコンポーネントにユニットテストを作成
- 重要な機能には統合テストを作成
- プロパティベーステストは `numRuns: 10-20` に制限
- `fc.asyncProperty` は React コンポーネントのテストで使用しない

## トラブルシューティング

### ビルドエラー

```bash
# node_modules を削除して再インストール
rm -rf node_modules
pnpm install

# Next.js のキャッシュをクリア
rm -rf .next
```

### 型エラー

```bash
# TypeScript の型チェック
pnpm type-check

# 型定義の再生成
pnpm build
```

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Vitest Documentation](https://vitest.dev)

## ライセンス

MIT
