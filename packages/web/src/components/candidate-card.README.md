# CandidateCard Component

次の一手候補を表示するカードコンポーネント。盤面プレビュー、説明文、投票機能を提供します。

## 概要

`CandidateCard`は、ユーザーが次の一手候補を閲覧し、投票するためのコンポーネントです。候補が適用された後の盤面プレビュー、手の位置、説明文、投票数を表示し、投票ボタンを提供します。

## 使用方法

```tsx
import { CandidateCard } from '@/components/candidate-card';

function GameDetailPage() {
  const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);

  const handleVote = async (candidateId: string) => {
    // API呼び出しで投票を送信
    await voteForCandidate(gameId, candidateId);
    setVotedCandidateId(candidateId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.candidateId}
          candidate={candidate}
          isVoted={votedCandidateId === candidate.candidateId}
          onVote={handleVote}
        />
      ))}
    </div>
  );
}
```

## Props

### `candidate` (必須)

- 型: `Candidate`
- 説明: 候補の情報

```typescript
interface Candidate {
  candidateId: string;
  gameId: string;
  position: string; // 例: "C4"
  description: string; // 最大200文字
  userId: string;
  username: string;
  voteCount: number;
  resultingBoardState: BoardState;
  createdAt: string;
}
```

### `isVoted` (必須)

- 型: `boolean`
- 説明: ユーザーがこの候補に投票済みかどうか
- `true`の場合、投票ボタンが無効化され、「✓ 投票済み」と表示されます

### `onVote` (必須)

- 型: `(candidateId: string) => void`
- 説明: 投票ボタンクリック時のハンドラー
- 引数: `candidateId` - 投票する候補のID

## 機能

### 盤面プレビュー

- 候補が適用された後の盤面状態を表示
- `Board`コンポーネントを使用（セルサイズ: 30px）
- カード内に収まるサイズで表示

### 候補情報

- **手の位置**: 大きく目立つように表示（例: "C4"）
- **投票数**: 右上に表示（例: "5票"）
- **説明文**: 最大3行で表示（`line-clamp-3`）
- **投稿者**: 小さく表示（例: "投稿者: ユーザー名"）

### 投票機能

#### 未投票時

- ボタンテキスト: "投票する"
- ボタンスタイル: 青色（`bg-blue-600`）
- ホバー時: 濃い青色（`hover:bg-blue-700`）
- クリック時: `onVote`ハンドラーを呼び出し

#### 投票済み時

- ボタンテキスト: "✓ 投票済み"
- ボタンスタイル: 緑色（`bg-green-100 text-green-700`）
- ボタンが無効化（`disabled`）
- クリックしても`onVote`は呼び出されない

## スタイリング

### レスポンシブデザイン

- モバイル: 単一カラムレイアウト
- デスクトップ: グリッドレイアウト（親コンポーネントで制御）

### カードデザイン

- 白背景（`bg-white`）
- 角丸（`rounded-lg`）
- シャドウ（`shadow-md`）
- ホバー時にシャドウが強調（`hover:shadow-lg`）

### 盤面プレビュー

- 灰色背景（`bg-gray-100`）
- 中央揃え
- パディング: 16px

## アクセシビリティ

### ARIA属性

- 投票ボタンに適切な`aria-label`を設定
  - 未投票時: `"C4に投票する"`
  - 投票済み時: `"投票済み"`

### キーボード操作

- 投票ボタンはキーボードでフォーカス可能
- Enterキーで投票可能

### スクリーンリーダー対応

- 盤面は`Board`コンポーネントのアクセシビリティ機能を継承
- ボタンの状態が適切に伝達される

## テスト

### ユニットテスト

```bash
pnpm --filter web test candidate-card.test.tsx --run
```

### テストカバレッジ

- レンダリング: 候補情報の表示
- 投票機能: ボタンクリック、ハンドラー呼び出し
- 投票済み状態: 表示、無効化
- アクセシビリティ: ARIA属性、キーボード操作
- エッジケース: 空の説明文、大きな投票数など

## 使用例

### 基本的な使用

```tsx
<CandidateCard
  candidate={{
    candidateId: 'candidate-1',
    gameId: 'game-1',
    position: 'C4',
    description: 'この手は中央を制圧し、次のターンで有利な展開を作ります。',
    userId: 'user-1',
    username: 'プレイヤー1',
    voteCount: 5,
    resultingBoardState: boardState,
    createdAt: '2024-01-01T00:00:00Z',
  }}
  isVoted={false}
  onVote={(candidateId) => console.log('Voted:', candidateId)}
/>
```

### グリッドレイアウト

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {candidates.map((candidate) => (
    <CandidateCard
      key={candidate.candidateId}
      candidate={candidate}
      isVoted={votedCandidateId === candidate.candidateId}
      onVote={handleVote}
    />
  ))}
</div>
```

## 関連コンポーネント

- `Board`: 盤面表示コンポーネント
- `GameCard`: 対局カードコンポーネント
- `MoveHistory`: 手履歴コンポーネント

## 要件

- Requirements: 7.1-7.12
- Client Component（`'use client'`ディレクティブ使用）
- React 19
- Tailwind CSS
