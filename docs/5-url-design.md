---
inclusion: manual
---

# URL 設計

フロントエンド（Next.js）の画面 URL 設計

## ベース URL

- 開発環境: `http://localhost:3000`
- ステージング環境: `https://stg.vote-board-game.example.com`
- 本番環境: `https://vote-board-game.example.com`

## URL 一覧

### 認証

#### `/login`

ログイン画面

- 認証: 不要
- 機能: メールアドレス・パスワードでログイン

#### `/register`

ユーザー登録画面

- 認証: 不要
- 機能: メールアドレス・パスワード・ユーザー名で登録

#### `/password-reset`

パスワードリセット画面

- 認証: 不要
- 機能: メールアドレスでパスワードリセット

### ユーザー

#### `/profile`

プロフィール画面

- 認証: 必要
- 機能: 自分のプロフィール表示・編集

### ゲーム

#### `/`

トップページ（ゲーム一覧）

- 認証: 不要
- 機能: 進行中のゲーム一覧表示
- クエリパラメータ:
  - `status`: `active` | `finished` (デフォルト: `active`)

#### `/games/new`

ゲーム作成画面

- 認証: 必要
- 機能: 新規ゲーム作成

#### `/games/[gameId]`

ゲーム詳細画面

- 認証: 不要
- 機能:
  - 現在の盤面表示
  - 手履歴表示
  - AI 解説表示
  - 次の一手候補一覧表示
  - 投票状況表示
- 例: `/games/456e7890-e89b-12d3-a456-426614174001`

#### `/games/[gameId]/turns/[turnNumber]`

特定ターンの盤面表示（過去の状態）

- 認証: 不要
- 機能:
  - 特定ターンの盤面表示
  - そのターンの手の詳細
  - そのターンの解説
- 例: `/games/456e7890-e89b-12d3-a456-426614174001/turns/5`
- 用途: SNS シェア用

### 候補・投票

#### `/games/[gameId]/candidates/new`

候補投稿画面

- 認証: 必要
- 機能: 次の一手候補の投稿
- 例: `/games/456e7890-e89b-12d3-a456-426614174001/candidates/new`

#### `/games/[gameId]/candidates/[candidateId]`

候補詳細画面

- 認証: 不要
- 機能:
  - 候補の詳細表示
  - 盤面プレビュー
  - 投票ボタン
- 例: `/games/456e7890-e89b-12d3-a456-426614174001/candidates/789e0123-e89b-12d3-a456-426614174002`
- 用途: SNS シェア用

## OGP 対応

### 動的 OGP 画像生成

以下の画面で盤面のサムネイル画像を動的生成

#### ゲーム詳細

- URL: `/games/[gameId]`
- OGP 画像: 現在の盤面
- タイトル: `オセロ対局 - ターン{currentTurn}`
- 説明: `AI vs 集合知の対局が進行中です`

#### 特定ターンの盤面

- URL: `/games/[gameId]/turns/[turnNumber]`
- OGP 画像: 特定ターンの盤面
- タイトル: `オセロ対局 - ターン{turnNumber}`
- 説明: `{side}の手: {position}`

#### 候補詳細

- URL: `/games/[gameId]/candidates/[candidateId]`
- OGP 画像: 候補の手を反映した盤面プレビュー
- タイトル: `次の一手候補: {position}`
- 説明: `{description}`

## リダイレクト

### 認証が必要な画面

未認証ユーザーがアクセスした場合:

```text
/profile → /login?redirect=/profile
/games/new → /login?redirect=/games/new
/games/[gameId]/candidates/new → /login?redirect=/games/[gameId]/candidates/new
```

### 認証済みユーザー

ログイン画面にアクセスした場合:

```text
/login → /
/register → /
```

## パンくずリスト

### ゲーム詳細

```text
トップ > ゲーム詳細
```

### 特定ターンの盤面

```text
トップ > ゲーム詳細 > ターン{turnNumber}
```

### 候補詳細

```text
トップ > ゲーム詳細 > 候補詳細
```

### 候補投稿

```text
トップ > ゲーム詳細 > 候補投稿
```

## Next.js App Router ディレクトリ構成

```text
app/
├── page.tsx                                    # / (トップページ)
├── login/
│   └── page.tsx                                # /login
├── register/
│   └── page.tsx                                # /register
├── password-reset/
│   └── page.tsx                                # /password-reset
├── profile/
│   └── page.tsx                                # /profile
├── games/
│   ├── new/
│   │   └── page.tsx                            # /games/new
│   └── [gameId]/
│       ├── page.tsx                            # /games/[gameId]
│       ├── opengraph-image.tsx                 # OGP画像生成
│       ├── turns/
│       │   └── [turnNumber]/
│       │       ├── page.tsx                    # /games/[gameId]/turns/[turnNumber]
│       │       └── opengraph-image.tsx         # OGP画像生成
│       └── candidates/
│           ├── new/
│           │   └── page.tsx                    # /games/[gameId]/candidates/new
│           └── [candidateId]/
│               ├── page.tsx                    # /games/[gameId]/candidates/[candidateId]
│               └── opengraph-image.tsx         # OGP画像生成
```

## SEO 対策

### メタタグ

各ページで適切な `title` と `description` を設定

```typescript
export const metadata = {
  title: 'ページタイトル',
  description: 'ページ説明',
  openGraph: {
    title: 'OGPタイトル',
    description: 'OGP説明',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Twitterタイトル',
    description: 'Twitter説明',
    images: ['/opengraph-image'],
  },
};
```

### robots.txt

```text
User-agent: *
Allow: /
Disallow: /profile
Disallow: /login
Disallow: /register
Disallow: /password-reset

Sitemap: https://vote-board-game.example.com/sitemap.xml
```

### sitemap.xml

動的に生成（進行中のゲーム一覧を含む）

## 404 ページ

存在しないゲーム ID やターン番号にアクセスした場合:

- 404 ページを表示
- トップページへのリンクを提供
