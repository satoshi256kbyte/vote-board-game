# @vote-board-game/web

フロントエンドアプリケーション（Next.js 15 + React 19）

## 開発

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 型チェック
pnpm type-check
```

## 技術スタック

- Next.js 15 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui
- Lucide React

## プロジェクト構造

```text
src/
├── app/              # Next.js App Router
│   ├── layout.tsx    # ルートレイアウト（globals.css読み込み）
│   ├── page.tsx      # ホームページ
│   └── globals.css   # グローバルスタイル（Tailwind + CSS変数）
└── lib/              # ユーティリティ
    └── utils.ts      # cn() - className結合関数
```

## スタイリング

Tailwind CSSとCSS変数ベースのカラーシステムを使用。ライト/ダークモード対応。

### Tailwindクラスの使用

```tsx
<div className="flex items-center justify-center p-4">
  <h1 className="text-4xl font-bold text-foreground">タイトル</h1>
</div>
```

### クラスの結合

条件付きクラスには`cn()`ユーティリティを使用：

```tsx
import { cn } from '@/lib/utils';

<div className={cn('base-class', condition && 'conditional-class')} />;
```

## shadcn/uiコンポーネント

必要に応じて`src/components/ui/`に追加予定。
