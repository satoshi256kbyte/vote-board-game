# Move History Component

手の履歴を表示するコンポーネント。新しい順（降順）にスクロール可能なリストで表示します。

## 使用例

### 基本的な使用方法（表示のみ）

```tsx
import { MoveHistory } from '@/components/move-history';
import type { Move } from '@/types/game';

const moves: Move[] = [
  {
    turn: 1,
    player: 'BLACK',
    position: 'D3',
    timestamp: '2024-01-01T00:00:00Z',
  },
  {
    turn: 2,
    player: 'WHITE',
    position: 'C3',
    timestamp: '2024-01-01T00:01:00Z',
  },
];

export function GameDetail() {
  return (
    <div>
      <h2>手の履歴</h2>
      <MoveHistory moves={moves} />
    </div>
  );
}
```

### インタラクティブモード（クリック可能）

```tsx
'use client';

import { useState } from 'react';
import { MoveHistory } from '@/components/move-history';
import type { Move } from '@/types/game';

export function GameDetailWithHistory() {
  const [selectedTurn, setSelectedTurn] = useState<number | undefined>();

  const moves: Move[] = [
    // ... 手の履歴
  ];

  const handleMoveClick = (turn: number) => {
    setSelectedTurn(turn);
    // その時点の盤面を表示するなどの処理
    console.log(`ターン${turn}が選択されました`);
  };

  return (
    <div>
      <h2>手の履歴</h2>
      <MoveHistory moves={moves} onMoveClick={handleMoveClick} selectedTurn={selectedTurn} />
    </div>
  );
}
```

## Props

| Prop           | 型                       | 必須 | デフォルト | 説明                                                                         |
| -------------- | ------------------------ | ---- | ---------- | ---------------------------------------------------------------------------- |
| `moves`        | `Move[]`                 | ✓    | -          | 手の履歴配列                                                                 |
| `onMoveClick`  | `(turn: number) => void` | -    | -          | 手がクリックされた時のハンドラー。指定するとインタラクティブモードになります |
| `selectedTurn` | `number`                 | -    | -          | 現在選択されているターン番号。指定した手がハイライトされます                 |

## Move型の定義

```typescript
interface Move {
  /** ターン数 */
  turn: number;
  /** プレイヤーの色 */
  player: 'BLACK' | 'WHITE';
  /** 手の位置（例: "D3"） */
  position: string;
  /** 手を打った日時（ISO 8601形式） */
  timestamp: string;
}
```

## 機能

### 表示機能

- ✅ 手を新しい順（降順）に表示
- ✅ ターン番号、プレイヤーの色、手の位置を表示
- ✅ プレイヤーの色を視覚的に表示（黒石・白石）
- ✅ スクロール可能なリスト（最大高さ: 24rem / 384px）
- ✅ 空の状態メッセージ（手がない場合）

### インタラクティブ機能

- ✅ 手のクリックイベント
- ✅ キーボード操作（Enter / Space）
- ✅ 選択された手のハイライト表示
- ✅ ホバー時の視覚的フィードバック

### アクセシビリティ

- ✅ セマンティックHTML（`role="list"`, `role="listitem"`）
- ✅ ARIA ラベル（各手の説明）
- ✅ キーボードナビゲーション（`tabIndex`）
- ✅ 選択状態の通知（`aria-current`）
- ✅ スクリーンリーダー対応

## スタイリング

コンポーネントは Tailwind CSS を使用してスタイリングされています。

### カスタマイズ可能な要素

- リストの最大高さ: `max-h-96` クラスを変更
- 選択時の背景色: `bg-blue-100` クラスを変更
- ホバー時の背景色: `hover:bg-gray-50` クラスを変更

## 注意事項

1. **Client Component**: このコンポーネントは `'use client'` ディレクティブを使用しているため、クライアントサイドでのみ動作します。

2. **ソート**: 手の配列は自動的に新しい順（降順）にソートされます。元の配列は変更されません。

3. **パフォーマンス**: 大量の手（60手以上）がある場合でも、仮想スクロールは実装していません。通常のオセロゲーム（最大60手）では問題ありません。

4. **キーの一意性**: 各手の `turn` プロパティをキーとして使用しています。同じターン番号の手が複数ある場合、React の警告が表示される可能性があります。

## テスト

コンポーネントは包括的なテストでカバーされています：

- レンダリングテスト
- 時系列順序のテスト
- インタラクティビティのテスト
- 選択ハイライトのテスト
- アクセシビリティのテスト
- エッジケースのテスト

テストを実行するには：

```bash
pnpm test move-history.test.tsx
```

## 関連コンポーネント

- `Board`: オセロの盤面を表示するコンポーネント
- `GameCard`: 対局のサマリー情報を表示するコンポーネント
- `CandidateCard`: 次の一手候補を表示するコンポーネント

## 要件

このコンポーネントは以下の要件を満たしています：

- Requirements 6.1-6.10（手履歴コンポーネント）
- Requirement 10（レスポンシブデザイン）
- Requirement 11（アクセシビリティ）
- Requirement 14（型安全性）
- Requirement 15（テスト可能性）
