# Board Component

オセロの盤面を表示するコンポーネント。表示専用モードとインタラクティブモードの両方をサポートします。

## 機能

- 8x8のオセロ盤面を表示
- 黒石・白石・空マスの表示
- 列ラベル（A-H）と行ラベル（1-8）の表示
- レスポンシブデザイン（デスクトップ/モバイル対応）
- インタラクティブモード（セルクリック対応）
- セルのハイライト表示
- キーボードアクセシビリティ対応
- ARIA ラベルによるスクリーンリーダー対応

## Props

```typescript
interface BoardProps {
  /** 盤面の状態（8x8配列: 0=空, 1=黒, 2=白） */
  boardState: BoardState;
  /** セルのサイズ（px）。デフォルト: デスクトップ40px、モバイル30px */
  cellSize?: number;
  /** セルクリック時のハンドラー（インタラクティブモード用） */
  onCellClick?: (row: number, col: number) => void;
  /** ハイライトするセル（インタラクティブモード用） */
  highlightedCell?: { row: number; col: number };
}
```

## 使用例

### 基本的な使用方法（表示専用）

```tsx
import { Board } from '@/components/board';
import type { BoardState } from '@/types/game';

const boardState: BoardState = {
  board: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 1, 0, 0, 0],
    [0, 0, 0, 1, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

export function GameBoard() {
  return <Board boardState={boardState} />;
}
```

### インタラクティブモード

```tsx
import { Board } from '@/components/board';
import { useState } from 'react';

export function InteractiveBoard() {
  const [highlightedCell, setHighlightedCell] = useState<{
    row: number;
    col: number;
  }>();

  const handleCellClick = (row: number, col: number) => {
    console.log(`Clicked: row=${row}, col=${col}`);
    setHighlightedCell({ row, col });
  };

  return (
    <Board
      boardState={boardState}
      onCellClick={handleCellClick}
      highlightedCell={highlightedCell}
    />
  );
}
```

### カスタムサイズ

```tsx
// 小さいサイズ（モバイル向け）
<Board boardState={boardState} cellSize={30} />

// 大きいサイズ（デスクトップ向け）
<Board boardState={boardState} cellSize={50} />
```

## アクセシビリティ

- `role="grid"` と `role="gridcell"` を使用した適切なセマンティック構造
- 各セルに `aria-label` を設定（例: "D4: 黒"）
- インタラクティブモードでは `tabIndex` を設定してキーボードナビゲーションに対応
- Enter キーと Space キーでセルを選択可能
- スクリーンリーダーで盤面の状態を読み上げ可能

## スタイリング

- Tailwind CSS を使用
- 緑色の盤面背景（`#10b981` - green-500）
- 黒い格子線
- 黒石: 黒い円
- 白石: 白い円（グレーの枠線付き）
- ハイライト: 黄色の背景（`bg-yellow-300`）
- ホバー効果: インタラクティブモードで緑色が濃くなる（`hover:bg-green-600`）

## テスト

コンポーネントは以下のテストでカバーされています：

- レンダリングテスト（盤面、石、ラベルの表示）
- アクセシビリティテスト（ARIA ラベル、キーボード操作）
- インタラクティビティテスト（クリック、キーボード入力）
- ハイライト表示テスト
- エッジケーステスト（空盤面、満盤面、状態変更）

テストの実行:

```bash
pnpm test src/components/board.test.tsx
```

## 要件

- Requirements: 5.1-5.13（オセロ盤面コンポーネント）
- TypeScript strict mode 対応
- React 19 対応
- Next.js 16 App Router 対応
