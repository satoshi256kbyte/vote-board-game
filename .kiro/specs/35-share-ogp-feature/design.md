# 設計ドキュメント: シェア・OGP 機能

## 概要

本設計は、投票対局の各画面（対局詳細、特定ターン、候補詳細）を SNS でシェアする際に、実際の盤面を描画した OGP 画像を生成し、適切なメタタグを設定する機能を実装するものである。

現在の実装では OGP 画像はプレースホルダー表示のみであり、盤面データを取得して描画する仕組みが未実装である。また、シェアボタンは汎用的な Web Share API のみ対応しており、X（Twitter）や LINE への直接シェアに未対応である。

本設計では以下を実現する:

1. OGP 画像 API ルートを改修し、バックエンド API から盤面データを取得して `@vercel/og`（ImageResponse）の JSX 内で盤面を描画する
2. 特定ターン用の OGP 画像生成エンドポイントを新設する
3. ShareButton コンポーネントを拡張し、X（Twitter）・LINE・リンクコピーの個別ボタンを提供する
4. 対局詳細画面を Server Component 化してメタタグ生成を可能にする（または layout.tsx でメタデータを生成する）
5. 特定ターン画面を新規作成し、メタタグを設定する
6. OGP 画像のキャッシュ制御を実装する

### 設計判断

**対局詳細画面のメタデータ生成方式**: 現在の対局詳細画面（`/games/[gameId]/page.tsx`）は `'use client'` の Client Component であり、`generateMetadata` を直接使用できない。Next.js App Router では `layout.tsx` に `generateMetadata` を配置することで、配下の Client Component ページにもメタデータを適用できる。この方式を採用し、`/games/[gameId]/layout.tsx` に `generateMetadata` を実装する。これにより既存の Client Component を大幅に変更せずにメタデータ生成が可能になる。

**OGP 画像内の盤面描画方式**: `@vercel/og` は内部で Satori を使用しており、JSX を直接 SVG に変換する。既存の `board-svg.tsx` は SVG 文字列を生成するが、`@vercel/og` では JSX で直接描画する必要がある。そのため、`board-svg.tsx` の SVG 文字列生成ロジックを参考にしつつ、OGP 画像用の JSX ベースの盤面描画コンポーネントを新たに作成する。

**特定ターンの盤面データ取得**: 現在のバックエンド API（`GET /api/games/:gameId`）は現在のターンの盤面のみを返す。特定ターンの盤面データを取得する API は存在しない。OGP 画像生成時に特定ターンの盤面を取得するには、バックエンド API に `GET /api/games/:gameId/turns/:turnNumber` エンドポイントを追加する必要がある。このエンドポイントは該当ターンの盤面状態を返す。

## アーキテクチャ

```mermaid
graph TD
    subgraph "SNS プラットフォーム"
        X[X/Twitter]
        LINE[LINE]
    end

    subgraph "Next.js フロントエンド (Vercel)"
        subgraph "ページ"
            GDP[対局詳細画面<br/>/games/[gameId]]
            TDP[特定ターン画面<br/>/games/[gameId]/turns/[turnNumber]]
            CDP[候補詳細画面<br/>/games/[gameId]/candidates/[candidateId]]
        end

        subgraph "メタデータ生成"
            GML[対局詳細 layout.tsx<br/>generateMetadata]
            TMG[特定ターン page.tsx<br/>generateMetadata]
            CMG[候補詳細 page.tsx<br/>generateMetadata]
        end

        subgraph "OGP 画像 API (Edge Runtime)"
            OG1[/api/og/game/[gameId]]
            OG2[/api/og/game/[gameId]/turn/[turnNumber]]
            OG3[/api/og/candidate/[candidateId]]
        end

        subgraph "共有コンポーネント"
            SB[ShareButton<br/>X / LINE / リンクコピー]
        end

        subgraph "OGP 描画"
            BR[OGP Board Renderer<br/>JSX ベース盤面描画]
        end
    end

    subgraph "バックエンド API (Hono on Lambda)"
        GA[GET /api/games/:gameId]
        TA[GET /api/games/:gameId/turns/:turnNumber]
        CA[GET /api/games/:gameId/turns/:turnNumber/candidates]
    end

    GDP --> GML
    TDP --> TMG
    CDP --> CMG

    GML --> OG1
    TMG --> OG2
    CMG --> OG3

    OG1 --> GA
    OG2 --> TA
    OG3 --> GA
    OG3 --> CA

    OG1 --> BR
    OG2 --> BR
    OG3 --> BR

    GDP --> SB
    TDP --> SB
    CDP --> SB

    SB --> X
    SB --> LINE
```

### データフロー

1. SNS クローラーがページ URL にアクセス → `generateMetadata` がメタタグを返す
2. メタタグ内の `og:image` URL を SNS クローラーがリクエスト → OGP 画像 API が盤面画像を生成して返す
3. ユーザーがシェアボタンをクリック → 各 SNS のシェア URL に遷移

## コンポーネントとインターフェース

### 1. OGP Board Renderer（盤面描画モジュール）

**ファイル**: `packages/web/src/lib/ogp/ogp-board-renderer.tsx`

`@vercel/og` の ImageResponse 内で使用する JSX ベースの盤面描画コンポーネント。

```typescript
interface OgpBoardRendererProps {
  boardState: number[][];
  highlightedCell?: { row: number; col: number };
  size?: number; // 盤面の幅・高さ（px）、デフォルト 350
}

// JSX を返す関数（React コンポーネントではなく、@vercel/og 用の JSX 要素を返す）
function renderOgpBoard(props: OgpBoardRendererProps): JSX.Element;
```

### 2. OGP 画像 API ルート

#### 2a. ゲーム詳細用 OGP 画像

**ファイル**: `packages/web/src/app/api/og/game/[gameId]/route.tsx`（既存改修）

- バックエンド API からゲームデータを取得
- `renderOgpBoard` で盤面を描画
- タイトル「オセロ対局 - ターン{currentTurn}」と石数を表示
- ゲームステータスに応じた Cache-Control ヘッダーを設定

#### 2b. 特定ターン用 OGP 画像

**ファイル**: `packages/web/src/app/api/og/game/[gameId]/turn/[turnNumber]/route.tsx`（新規）

- バックエンド API から特定ターンの盤面データを取得
- `renderOgpBoard` で盤面を描画
- タイトル「オセロ対局 - ターン{turnNumber}」と石数を表示
- Cache-Control: 24 時間（過去の盤面は変更されない）

#### 2c. 候補詳細用 OGP 画像

**ファイル**: `packages/web/src/app/api/og/candidate/[candidateId]/route.tsx`（既存改修）

- バックエンド API からゲームデータと候補データを取得
- `renderOgpBoard` で候補適用後の盤面を描画（候補の手の位置をハイライト）
- タイトル「次の一手候補: {position}」と石数を表示

### 3. ShareButton コンポーネント

**ファイル**: `packages/web/src/components/share-button.tsx`（既存改修）

```typescript
interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
}

// 3つのボタンを横並びで表示:
// - X（Twitter）シェアボタン
// - LINE シェアボタン
// - リンクコピーボタン
```

各ボタンの動作:

- X: `https://twitter.com/intent/tweet?text={title}&url={url}` を新しいウィンドウで開く
- LINE: `https://social-plugins.line.me/lineit/share?url={url}` を新しいウィンドウで開く
- リンクコピー: Clipboard API で URL をコピー、2 秒間「コピーしました」を表示

### 4. メタデータ生成

#### 4a. 対局詳細画面

**ファイル**: `packages/web/src/app/games/[gameId]/layout.tsx`（新規）

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  // バックエンド API からゲームデータを取得
  // og:title, og:description, og:image, twitter:card を設定
  // エラー時はフォールバックメタデータを返す
}
```

#### 4b. 特定ターン画面

**ファイル**: `packages/web/src/app/games/[gameId]/turns/[turnNumber]/page.tsx`（新規）

Server Component として実装。`generateMetadata` でメタタグを生成し、盤面表示と ShareButton を配置する。

#### 4c. 候補詳細画面

**ファイル**: `packages/web/src/app/games/[gameId]/candidates/[candidateId]/page.tsx`（既存改修）

既存の `generateMetadata` を改修し、`og:image` URL が実際の盤面を描画するエンドポイントを参照するようにする。

### 5. バックエンド API 拡張

**ファイル**: `packages/api/src/routes/games.ts`（既存改修）

```typescript
// GET /api/games/:gameId/turns/:turnNumber
// 特定ターンの盤面データを返す
interface TurnResponse {
  gameId: string;
  turnNumber: number;
  boardState: BoardState;
  currentPlayer: 'BLACK' | 'WHITE';
}
```

## データモデル

### 既存データモデル（変更なし）

#### Game

```typescript
interface Game {
  gameId: string;
  gameType: GameType;
  status: GameStatus; // 'ACTIVE' | 'FINISHED'
  aiSide: PlayerColor;
  currentTurn: number;
  boardState: BoardState; // { board: number[][] }
  winner?: Winner;
  createdAt: string;
  updatedAt: string;
}
```

#### Candidate（API レスポンス）

```typescript
interface CandidateApiResponse {
  candidateId: string;
  position: string;
  description: string;
  voteCount: number;
  createdBy: string;
  status: string;
  votingDeadline: string;
  createdAt: string;
}
```

### 新規データモデル

#### TurnResponse（特定ターン API レスポンス）

```typescript
interface TurnResponse {
  gameId: string;
  turnNumber: number;
  boardState: {
    board: number[][]; // 8x8 配列（0=空、1=黒、2=白）
  };
  currentPlayer: 'BLACK' | 'WHITE';
}
```

#### OGP 画像生成に必要なデータ

OGP 画像 API ルートは、バックエンド API からデータを取得して画像を生成する。クエリパラメータでデータを渡す現在の方式は廃止し、API ルート内で直接バックエンド API を呼び出す方式に変更する。

```typescript
// ゲーム詳細 OGP に必要なデータ
interface GameOgpData {
  boardState: number[][];
  currentTurn: number;
  status: GameStatus;
  blackCount: number;
  whiteCount: number;
}

// 候補詳細 OGP に必要なデータ
interface CandidateOgpData {
  boardState: number[][]; // 候補適用後の盤面
  position: string;
  highlightedCell: { row: number; col: number };
  blackCount: number;
  whiteCount: number;
  description: string;
}
```

## 正当性プロパティ（Correctness Properties）

_プロパティとは、システムのすべての有効な実行において成り立つべき特性や振る舞いのことである。人間が読める仕様と機械的に検証可能な正当性保証の橋渡しとなる。_

### Property 1: 盤面描画の正当性

_任意の_ 有効なオセロ盤面状態（8x8 の数値配列、各セルが 0, 1, 2 のいずれか）に対して、`renderOgpBoard` が生成する JSX 構造は、値が 1 のセルに黒色の円要素、値が 2 のセルに白色の円要素（灰色枠線付き）、値が 0 のセルに緑色背景のみの要素を含み、ハイライト指定されたセルには黄色背景が適用されること。

**Validates: Requirements 1.1, 1.2, 1.3, 2.1**

### Property 2: 石数カウントの正確性

_任意の_ 有効なオセロ盤面状態に対して、盤面から算出される黒石数（値 1 のセル数）と白石数（値 2 のセル数）は、配列内の実際の値の出現回数と一致すること。

**Validates: Requirements 1.5**

### Property 3: SNS シェア URL の構築

_任意の_ タイトル文字列と URL 文字列に対して、X（Twitter）シェア URL は `https://twitter.com/intent/tweet` をベースに `text` と `url` パラメータを含み、LINE シェア URL は `https://social-plugins.line.me/lineit/share` をベースに `url` パラメータを含むこと。パラメータ値は適切に URI エンコードされていること。

**Validates: Requirements 3.1, 3.2**

### Property 4: メタデータタイトルのフォーマット

_任意の_ 正の整数のターン番号と任意のポジション文字列に対して、対局詳細のメタデータタイトルは「オセロ対局 - ターン{currentTurn}」、特定ターンのメタデータタイトルは「オセロ対局 - ターン{turnNumber}」、候補詳細のメタデータタイトルは「次の一手候補: {position}」のフォーマットに従うこと。

**Validates: Requirements 1.4, 2.2, 4.1, 5.1, 6.1**

### Property 5: メタデータ説明文の生成

_任意の_ ゲームステータス（ACTIVE または FINISHED）に対して、対局詳細の説明文は ACTIVE 時に「AI vs 集合知の対局が進行中です」、FINISHED 時に「対局が終了しました」となること。_任意の_ 候補説明文に対して、メタデータの説明文は最大 100 文字に切り詰められること。

**Validates: Requirements 4.2, 5.2, 6.2**

### Property 6: OGP 画像 URL の構築

_任意の_ gameId、turnNumber、candidateId に対して、メタデータ内の `og:image` URL は対応する OGP 画像生成エンドポイント（`/api/og/game/{gameId}`、`/api/og/game/{gameId}/turn/{turnNumber}`、`/api/og/candidate/{candidateId}`）を正しく参照すること。

**Validates: Requirements 4.3, 5.3, 6.3**

### Property 7: Cache-Control ヘッダーの正当性

_任意の_ ゲームステータスに対して、ACTIVE な対局の OGP 画像レスポンスは `max-age=3600, s-maxage=3600` を含む Cache-Control ヘッダーを持ち、FINISHED な対局および特定ターンの OGP 画像レスポンスは `max-age=86400, s-maxage=86400` を含む Cache-Control ヘッダーを持つこと。

**Validates: Requirements 7.2, 7.3, 7.4**

## エラーハンドリング

### OGP 画像生成 API

| エラー条件                            | 対応                                                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| バックエンド API からのデータ取得失敗 | フォールバック画像（「投票対局」タイトル + エラーメッセージ）を返却。HTTP 200 で画像を返す（SNS クローラーが画像を取得できるようにする） |
| 無効な gameId / candidateId           | フォールバック画像を返却                                                                                                                 |
| 存在しないターン番号                  | フォールバック画像を返却                                                                                                                 |
| 画像生成処理の内部エラー              | HTTP 500 + エラーメッセージ                                                                                                              |

### ShareButton コンポーネント

| エラー条件                 | 対応                                                          |
| -------------------------- | ------------------------------------------------------------- |
| Clipboard API 未対応       | 「リンクのコピーに失敗しました」エラーメッセージを 2 秒間表示 |
| Clipboard API 書き込み失敗 | 「リンクのコピーに失敗しました」エラーメッセージを 2 秒間表示 |

### メタデータ生成

| エラー条件                                          | 対応                                                        |
| --------------------------------------------------- | ----------------------------------------------------------- |
| バックエンド API からのデータ取得失敗（対局詳細）   | フォールバックメタデータ: タイトル「対局詳細 - 投票対局」   |
| バックエンド API からのデータ取得失敗（特定ターン） | フォールバックメタデータ: タイトル「ターン詳細 - 投票対局」 |
| バックエンド API からのデータ取得失敗（候補詳細）   | 既存のフォールバックメタデータを維持                        |

## テスト戦略

### テストフレームワーク

- **ユニットテスト・統合テスト**: Vitest
- **コンポーネントテスト**: React Testing Library
- **プロパティベーステスト**: fast-check

### プロパティベーステスト

プロパティベーステストは fast-check を使用し、各テストは `numRuns: 10`（JSDOM 環境の安定性のため）、`endOnFailure: true` で実行する。

各プロパティテストには設計ドキュメントのプロパティ番号を参照するタグコメントを付与する:

```typescript
// Feature: share-ogp-feature, Property 1: 盤面描画の正当性
```

#### プロパティテスト対象

| プロパティ | テスト内容                       | ジェネレータ                                                                 |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Property 1 | `renderOgpBoard` の JSX 構造検証 | 8x8 の数値配列（各セル 0-2）、オプショナルなハイライトセル座標               |
| Property 2 | 石数カウント関数の検証           | 8x8 の数値配列（各セル 0-2）                                                 |
| Property 3 | シェア URL 構築関数の検証        | 任意の文字列（タイトル、URL）                                                |
| Property 4 | メタデータタイトル生成関数の検証 | 正の整数（ターン番号）、文字列（ポジション）                                 |
| Property 5 | メタデータ説明文生成関数の検証   | ゲームステータス、任意長の文字列（説明文）                                   |
| Property 6 | OGP 画像 URL 構築関数の検証      | UUID 文字列（gameId, candidateId）、正の整数（turnNumber）                   |
| Property 7 | Cache-Control ヘッダー値の検証   | ゲームステータス（ACTIVE / FINISHED）、画像タイプ（game / turn / candidate） |

### ユニットテスト

ユニットテストはプロパティテストを補完し、具体的なエッジケースとエラー条件に焦点を当てる:

- **OGP 画像 API**: API 取得失敗時のフォールバック画像返却、存在しないターン番号のハンドリング
- **ShareButton**: Clipboard API 未対応時のエラー表示、各ボタンの aria-label 属性の存在確認
- **メタデータ生成**: API 取得失敗時のフォールバックメタデータ、twitter:card が `summary_large_image` であること
