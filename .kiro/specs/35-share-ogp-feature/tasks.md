# 実装タスク: シェア・OGP 機能

## 概要

OGP 画像にプレースホルダーではなく実際のオセロ盤面を描画し、SNS 別シェアボタン（X/Twitter、LINE、リンクコピー）を追加し、全対象画面（対局詳細、特定ターン、候補詳細）にメタタグを設定する。バックエンドには特定ターンの盤面データを返す API エンドポイントを追加する。OGP 画像 API は Edge Runtime 上で `@vercel/og`（ImageResponse）を使用し、JSX ベースで盤面を描画する。

## タスク

- [x] 1. OGP 盤面描画モジュールとユーティリティ関数の作成
  - [x] 1.1 `packages/web/src/lib/ogp/ogp-board-renderer.tsx` に JSX ベースの盤面描画関数を作成する
    - `renderOgpBoard(props: OgpBoardRendererProps): JSX.Element` 関数を実装
    - `OgpBoardRendererProps` インターフェース: `boardState: number[][]`, `highlightedCell?: { row: number; col: number }`, `size?: number`（デフォルト 350）
    - 8x8 のグリッドを描画: 値 0 は緑色背景のみ、値 1 は黒色の円、値 2 は白色の円（灰色枠線付き）
    - `highlightedCell` 指定時は該当セルの背景を黄色にする
    - `@vercel/og` の Satori 互換 JSX（flexbox ベース、`display: 'flex'` 必須）で実装
    - _要件: 1.1, 1.2, 1.3, 2.1_

  - [x] 1.2 `packages/web/src/lib/ogp/ogp-utils.ts` にユーティリティ関数を作成する
    - `countDiscs(board: number[][]): { black: number; white: number }` — 盤面の黒石・白石数をカウント
    - `formatGameTitle(currentTurn: number): string` — `オセロ対局 - ターン{currentTurn}` を返す
    - `formatCandidateTitle(position: string): string` — `次の一手候補: {position}` を返す
    - `formatGameDescription(status: 'ACTIVE' | 'FINISHED'): string` — ACTIVE: `AI vs 集合知の対局が進行中です`、FINISHED: `対局が終了しました`
    - `truncateDescription(text: string, maxLength?: number): string` — 最大 100 文字に切り詰め
    - `buildOgpImageUrl(path: string): string` — `NEXT_PUBLIC_APP_URL` をベースに OGP 画像 URL を構築
    - `buildShareUrlForX(title: string, url: string): string` — X シェア URL を構築（URI エンコード済み）
    - `buildShareUrlForLine(url: string): string` — LINE シェア URL を構築（URI エンコード済み）
    - `getCacheControlHeader(status: 'ACTIVE' | 'FINISHED' | 'TURN'): string` — ステータスに応じた Cache-Control ヘッダー値を返す
    - _要件: 1.4, 1.5, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 7.2, 7.3, 7.4_

  - [x] 1.3 `packages/web/src/lib/ogp/ogp-board-renderer.property.test.tsx` にプロパティベーステストを作成する
    - **Property 1: 盤面描画の正当性**
    - 任意の有効な 8x8 盤面（各セル 0-2）に対して、`renderOgpBoard` の JSX 構造が正しい要素を含むことを検証
    - ジェネレータ: `fc.array(fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 8, maxLength: 8 }), { minLength: 8, maxLength: 8 })`
    - `numRuns: 10`, `endOnFailure: true`, 同期 `fc.property` を使用
    - **検証: 要件 1.1, 1.2, 1.3, 2.1**

  - [x] 1.4 `packages/web/src/lib/ogp/ogp-utils.property.test.ts` にプロパティベーステストを作成する
    - **Property 2: 石数カウントの正確性**
    - 任意の 8x8 盤面に対して `countDiscs` の結果が配列内の実際の出現回数と一致することを検証
    - **検証: 要件 1.5**
    - **Property 3: SNS シェア URL の構築**
    - 任意のタイトル・URL 文字列に対して `buildShareUrlForX` が `twitter.com/intent/tweet` を含み、`buildShareUrlForLine` が `social-plugins.line.me/lineit/share` を含むことを検証
    - **検証: 要件 3.1, 3.2**
    - **Property 4: メタデータタイトルのフォーマット**
    - 任意の正の整数とポジション文字列に対して、タイトル生成関数が正しいフォーマットに従うことを検証
    - **検証: 要件 1.4, 2.2, 4.1, 5.1, 6.1**
    - **Property 5: メタデータ説明文の生成**
    - 任意のステータスと説明文に対して、説明文生成関数が正しい値を返し、切り詰めが 100 文字以内であることを検証
    - **検証: 要件 4.2, 5.2, 6.2**
    - **Property 6: OGP 画像 URL の構築**
    - 任意の gameId, turnNumber, candidateId に対して、`buildOgpImageUrl` が正しいパスを含む URL を返すことを検証
    - **検証: 要件 4.3, 5.3, 6.3**
    - **Property 7: Cache-Control ヘッダーの正当性**
    - 任意のステータスに対して、`getCacheControlHeader` が正しい max-age 値を返すことを検証
    - **検証: 要件 7.2, 7.3, 7.4**
    - `numRuns: 10`, `endOnFailure: true`, 同期 `fc.property` を使用

- [-] 2. チェックポイント - OGP 描画モジュールの検証
  - すべてのテストが pass することを確認し、ユーザーに質問があれば確認する。

- [x] 3. ゲーム詳細用 OGP 画像 API の改修
  - [x] 3.1 `packages/web/src/app/api/og/game/[gameId]/route.tsx` を改修する
    - クエリパラメータ方式を廃止し、API ルート内でバックエンド API（`NEXT_PUBLIC_API_URL`）から直接ゲームデータを fetch する
    - `renderOgpBoard` で実際の盤面を描画
    - タイトル「オセロ対局 - ターン{currentTurn}」と石数を `countDiscs` で算出して表示
    - ゲームステータスに応じた `Cache-Control` ヘッダーを `getCacheControlHeader` で設定
    - データ取得失敗時はフォールバック画像（「投票対局」タイトル + エラーメッセージ）を HTTP 200 で返却
    - `ImageResponse` のサイズは 1200x630
    - _要件: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3_

  - [x] 3.2 `packages/web/src/app/api/og/game/[gameId]/route.test.tsx` のユニットテストを更新する
    - バックエンド API の fetch をモックし、正常時に盤面画像が返ることを検証
    - データ取得失敗時にフォールバック画像が返ることを検証
    - ACTIVE / FINISHED で Cache-Control ヘッダーが異なることを検証
    - _要件: 1.1, 1.6, 7.2, 7.3_

- [x] 4. 特定ターン用バックエンド API の追加
  - [x] 4.1 `packages/api/src/routes/games.ts` に `GET /api/games/:gameId/turns/:turnNumber` エンドポイントを追加する
    - パスパラメータ `gameId`（UUID）と `turnNumber`（正の整数）をバリデーション
    - `GameService` に `getGameTurn(gameId, turnNumber)` メソッドを追加（または既存の `getGame` を拡張）
    - DynamoDB から該当ターンの盤面データ（`TURN#` アイテム）を取得
    - レスポンス: `{ gameId, turnNumber, boardState: { board: number[][] }, currentPlayer: 'BLACK' | 'WHITE' }`
    - 対局が存在しない場合は 404、ターンが存在しない場合は 404 を返す
    - `packages/api/src/schemas/game.ts` にターンパラメータのバリデーションスキーマを追加
    - _要件: 2.1, 2.3_

  - [x] 4.2 `packages/api/src/routes/games.test.ts` にターン API のユニットテストを追加する
    - 正常なターン取得、存在しない gameId、存在しないターン番号のテスト
    - _要件: 2.1, 2.3_

- [x] 5. 特定ターン用 OGP 画像 API の新規作成
  - [x] 5.1 `packages/web/src/app/api/og/game/[gameId]/turn/[turnNumber]/route.tsx` を新規作成する
    - バックエンド API（`GET /api/games/:gameId/turns/:turnNumber`）から盤面データを取得
    - `renderOgpBoard` で盤面を描画
    - タイトル「オセロ対局 - ターン{turnNumber}」と石数を表示
    - `Cache-Control: public, max-age=86400, s-maxage=86400`（過去の盤面は不変）
    - データ取得失敗時はフォールバック画像を返却
    - Edge Runtime、`ImageResponse` 1200x630
    - _要件: 2.1, 2.2, 2.3, 7.4_

  - [x] 5.2 `packages/web/src/app/api/og/game/[gameId]/turn/[turnNumber]/route.test.tsx` にユニットテストを作成する
    - 正常時の画像生成、存在しないターンのフォールバック、Cache-Control ヘッダーの検証
    - _要件: 2.1, 2.3, 7.4_

- [-] 6. 候補詳細用 OGP 画像 API の改修
  - [-] 6.1 `packages/web/src/app/api/og/candidate/[candidateId]/route.tsx` を改修する
    - クエリパラメータ方式を廃止し、バックエンド API から直接ゲームデータと候補データを取得
    - `renderOgpBoard` で候補適用後の盤面を描画（候補の手の位置を `highlightedCell` でハイライト）
    - タイトル「次の一手候補: {position}」と石数を表示
    - データ取得失敗時はフォールバック画像を返却
    - _要件: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [~] 6.2 `packages/web/src/app/api/og/candidate/[candidateId]/route.test.tsx` のユニットテストを更新する
    - 正常時の画像生成（ハイライト付き盤面）、データ取得失敗時のフォールバックを検証
    - _要件: 1.2, 1.6_

- [~] 7. チェックポイント - OGP 画像 API の検証
  - すべてのテストが pass することを確認し、ユーザーに質問があれば確認する。

- [ ] 8. ShareButton コンポーネントの拡張
  - [~] 8.1 `packages/web/src/components/share-button.tsx` を改修する
    - 既存の Web Share API ベースの単一ボタンを、3 つの個別ボタン（X、LINE、リンクコピー）に変更
    - X ボタン: `buildShareUrlForX` で URL を構築し `window.open` で新しいウィンドウを開く
    - LINE ボタン: `buildShareUrlForLine` で URL を構築し `window.open` で新しいウィンドウを開く
    - リンクコピーボタン: Clipboard API で URL をコピー、成功時 2 秒間「コピーしました」表示、失敗時「リンクのコピーに失敗しました」表示
    - 各ボタンに Lucide React アイコンとラベルテキスト、`aria-label` 属性を設定
    - `ShareButtonProps` は既存の `title`, `text`, `url?` を維持
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [~] 8.2 `packages/web/src/components/share-button.test.tsx` のユニットテストを更新する
    - X ボタンクリック時に正しい URL で `window.open` が呼ばれることを検証
    - LINE ボタンクリック時に正しい URL で `window.open` が呼ばれることを検証
    - リンクコピー成功時に「コピーしました」が 2 秒間表示されることを検証
    - Clipboard API 未対応時に「リンクのコピーに失敗しました」が表示されることを検証
    - 各ボタンの `aria-label` 属性の存在を検証
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. 対局詳細画面のメタデータ生成
  - [~] 9.1 `packages/web/src/app/games/[gameId]/layout.tsx` を新規作成する
    - `generateMetadata` 関数でバックエンド API からゲームデータを取得
    - `og:title`: `formatGameTitle(currentTurn)`
    - `og:description`: `formatGameDescription(status)`
    - `og:image`: `buildOgpImageUrl(`/api/og/game/${gameId}`)`
    - `twitter:card`: `summary_large_image`
    - データ取得失敗時はフォールバックメタデータ（タイトル: 「対局詳細 - 投票対局」）を返却
    - `children` を受け取って返す layout コンポーネントも実装
    - _要件: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [~] 9.2 `packages/web/src/app/games/[gameId]/layout.test.tsx` にユニットテストを作成する
    - `generateMetadata` が正しいメタデータを返すことを検証
    - データ取得失敗時にフォールバックメタデータが返ることを検証
    - `twitter:card` が `summary_large_image` であることを検証
    - _要件: 4.1, 4.2, 4.3, 4.4, 4.6_

- [ ] 10. 特定ターン画面の新規作成
  - [~] 10.1 `packages/web/src/app/games/[gameId]/turns/[turnNumber]/page.tsx` を新規作成する
    - Server Component として実装
    - `generateMetadata` でメタタグを生成: `og:title` = `formatGameTitle(turnNumber)`, `og:description` = `ターン{turnNumber}の盤面`, `og:image` = 特定ターン用 OGP URL, `twitter:card` = `summary_large_image`
    - バックエンド API から特定ターンの盤面データを取得して `Board` コンポーネントで表示
    - `ShareButton` を配置
    - 対局詳細画面への戻りリンクを配置
    - データ取得失敗時は `notFound()` を呼び出す
    - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 3.6_

  - [~] 10.2 `packages/web/src/app/games/[gameId]/turns/[turnNumber]/page.test.tsx` にユニットテストを作成する
    - `generateMetadata` が正しいメタデータを返すことを検証
    - 盤面と ShareButton が表示されることを検証
    - _要件: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. 候補詳細画面のメタタグ改善
  - [~] 11.1 `packages/web/src/app/games/[gameId]/candidates/[candidateId]/page.tsx` の `generateMetadata` を改修する
    - `og:title`: `formatCandidateTitle(position)`
    - `og:description`: `truncateDescription(description, 100)`
    - `og:image`: クエリパラメータ方式を廃止し、`buildOgpImageUrl(`/api/og/candidate/${candidateId}`)` を使用
    - `twitter:card`: `summary_large_image`（既存を維持）
    - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 12. フロントエンド API クライアントの拡張
  - [~] 12.1 `packages/web/src/lib/api/client.ts` に特定ターンデータ取得関数を追加する
    - `fetchGameTurn(gameId: string, turnNumber: number): Promise<TurnResponse>` を実装
    - `TurnResponse` 型を `packages/web/src/types/game.ts` に追加
    - _要件: 2.1_

- [ ] 13. チェックポイント - 全機能の統合検証
  - すべてのテストが pass することを確認し、ユーザーに質問があれば確認する。

## 備考

- `*` 付きのタスクはオプションであり、MVP 達成を優先する場合はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントで段階的に検証を行い、問題を早期に発見する
- プロパティベーステストは fast-check を使用し、`numRuns: 10`、`endOnFailure: true`、同期 `fc.property` で実行
- OGP 画像 API は Edge Runtime で動作するため、Node.js 固有の API は使用不可
