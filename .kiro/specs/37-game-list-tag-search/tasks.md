# 実装計画: 対局一覧タグ検索

## 概要

対局一覧画面（トップページ）にタグベースの検索・フィルタリング機能を追加する。
`tag-utils.ts` のユーティリティ関数から始め、カスタムフック、UIコンポーネントの順に実装し、
最後に既存コンポーネント（GameCard, GameList）を拡張して全体を結合する。

## タスク

- [x] 1. GameSummary 型に tags フィールドを追加し、tag-utils.ts を実装する
  - [x] 1.1 GameSummary 型に tags フィールドを追加する
    - `packages/web/src/types/game.ts` の `GameSummary` インターフェースに `tags: string[]` を追加
    - API レスポンスとの整合性を確保（API 側は既に `tags` を返却済み）
    - 既存テスト（`game.test.ts`）を更新し、`tags` フィールドを含むテストデータに修正
    - _Requirements: 2.1, 2.4, 6.1_
  - [x] 1.2 tag-utils.ts のコアユーティリティ関数を実装する
    - `packages/web/src/lib/utils/tag-utils.ts` を新規作成
    - `GAME_TYPE_LABEL_MAP` 定数（OTHELLO→オセロ, CHESS→チェス, GO→囲碁, SHOGI→将棋）
    - `TagSuggestion`, `SelectedTag`, `TagInfo` 型定義
    - `buildTagSuggestions(games)`: 対局データからタグ候補リスト生成（E2E除外、重複排除）
    - `matchesTags(game, selectedTags)`: AND条件でのタグマッチ判定
    - `filterSuggestions(suggestions, query)`: 部分一致フィルタリング
    - `getGameTags(game)`: 対局からタグ一覧取得（gameType仮想タグ + カスタムタグ、E2E除外、最大3個）
    - `parseTagsFromUrl(params)`: URLクエリパラメータからタグ配列をパース
    - `tagsToUrlParam(tags)`: タグ配列をURLクエリパラメータに変換
    - _Requirements: 2.2, 2.3, 2.5, 3.1, 3.3, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.4, 8.1, 8.2_
  - [x] 1.3 tag-utils.ts のユニットテストを作成する
    - `packages/web/src/lib/utils/tag-utils.test.ts` を新規作成
    - 各関数の代表的な入出力の具体例テスト
    - エッジケース: 空配列、E2Eタグのみ、タグ超過時の切り捨て、不正URL値
    - _Requirements: 2.2, 2.3, 3.1, 3.3, 5.1, 5.4, 5.5, 6.2, 6.4, 8.1, 8.2_
  - [x] 1.4 tag-utils.ts のプロパティベーステストを作成する（Property 1〜7）
    - `packages/web/src/lib/utils/tag-utils.property.test.ts` を新規作成
    - fast-check 使用、`numRuns: 15`, `endOnFailure: true`
    - `afterEach` で `cleanup()`, `vi.clearAllTimers()`, `vi.clearAllMocks()` を実行
    - [x] 1.4.1 Property 1: ANDフィルタリングの正確性
      - **Property 1: ANDフィルタリングの正確性**
      - フィルタリング結果の全対局が選択タグを全て保持、空タグ時は全件一致
      - **Validates: Requirements 3.3, 3.5**
    - [x] 1.4.2 Property 2: タグ候補生成の正確性
      - **Property 2: タグ候補生成の正確性**
      - E2E除外、重複なし、全候補が入力データに由来
      - **Validates: Requirements 5.1, 5.4, 5.5**
    - [x] 1.4.3 Property 3: 部分一致フィルタリングの正確性
      - **Property 3: 部分一致フィルタリングの正確性**
      - 結果の全タグ表示名が検索文字列を部分文字列として含む
      - **Validates: Requirements 3.1**
    - [x] 1.4.4 Property 4: 対局カードタグ表示の正確性
      - **Property 4: 対局カードタグ表示の正確性**
      - E2E除外、gameType+カスタムタグ両方含む、最大3個
      - **Validates: Requirements 6.1, 6.2, 6.4**
    - [x] 1.4.5 Property 5: ゲーム種類ラベルマッピングの完全性
      - **Property 5: ゲーム種類ラベルマッピングの完全性**
      - 既知gameType全てに日本語表示名が存在、タグ種類が区別される
      - **Validates: Requirements 2.3, 2.5**
    - [x] 1.4.6 Property 6: URLタグパラメータのラウンドトリップ
      - **Property 6: URLタグパラメータのラウンドトリップ**
      - `tagsToUrlParam` → `parseTagsFromUrl` で元のタグ配列と一致
      - **Validates: Requirements 8.1, 8.2**
    - [x] 1.4.7 Property 7: ステータスフィルタとタグフィルタの直交性
      - **Property 7: ステータスフィルタとタグフィルタの直交性**
      - ステータスフィルタとタグフィルタの適用順序に関わらず結果が同一
      - **Validates: Requirements 4.5**

- [x] 2. チェックポイント - テスト実行確認
  - `pnpm test` で全テストが pass することを確認し、ユーザーに質問があれば確認する。

- [x] 3. カスタムフック（useTagFilter, useTagUrlSync）を実装する
  - [x] 3.1 useTagFilter フックを実装する
    - `packages/web/src/lib/hooks/use-tag-filter.ts` を新規作成
    - `tag-utils.ts` の関数を使用してフィルタリングロジックを構築
    - `filteredGames`, `selectedTags`, `suggestions`, `addTag`, `removeTag`, `clearTags`, `resultCount` を返却
    - `initialTags` からの初期状態復元に対応
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.6_
  - [x] 3.2 useTagUrlSync フックを実装する
    - `packages/web/src/lib/hooks/use-tag-url-sync.ts` を新規作成
    - Next.js の `useRouter`, `useSearchParams` を使用
    - タグ選択時に URL クエリパラメータ（`?tags=オセロ,タグ名`）を更新
    - URL からタグを復元し `onTagsChange` コールバックで通知
    - `router.push` でブラウザ履歴にエントリを追加
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 3.3 useTagFilter のユニットテストを作成する
    - `packages/web/src/lib/hooks/use-tag-filter.test.ts` を新規作成
    - `renderHook` + `act` でフックの状態変更をテスト
    - タグ追加・削除・クリア、フィルタリング結果の検証
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 3.4 useTagUrlSync のユニットテストを作成する
    - `packages/web/src/lib/hooks/use-tag-url-sync.test.ts` を新規作成
    - `useRouter`, `useSearchParams` をモックしてテスト
    - URL パラメータの更新・復元を検証
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. 新規UIコンポーネント（TagChip, TagSearchInput, TagDropdown, SelectedTagChips）を実装する
  - [x] 4.1 TagChip コンポーネントを実装する
    - `packages/web/src/components/tag-chip.tsx` を新規作成
    - ゲーム種類タグ: 色付き背景、カスタムタグ: アウトライン表示
    - `onClick`（対局カード内でフィルタ追加用）と `onRemove`（選択済みタグ削除用）をサポート
    - `role="option"` と適切な `aria-*` 属性を設定
    - _Requirements: 2.3, 6.3, 7.5_
  - [x] 4.2 TagDropdown コンポーネントを実装する
    - `packages/web/src/components/tag-dropdown.tsx` を新規作成
    - タグ候補のドロップダウンリスト表示
    - キーボード操作: 上下矢印キーで移動、Enter で選択、Escape で閉じる
    - ハイライト表示と候補0件時の「候補なし」メッセージ
    - _Requirements: 3.1, 7.2, 7.3_
  - [x] 4.3 TagSearchInput コンポーネントを実装する
    - `packages/web/src/components/tag-search-input.tsx` を新規作成
    - shadcn/ui の Input ベース、Lucide React の `Search` アイコン左配置
    - プレースホルダー「タグで検索...」
    - テキスト入力で `filterSuggestions` を呼び出し、TagDropdown を表示
    - タグ選択後に入力テキストをクリア
    - `role="combobox"` と適切な `aria-*` 属性を設定
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 7.1, 7.2, 7.3, 7.4_
  - [x] 4.4 SelectedTagChips コンポーネントを実装する
    - `packages/web/src/components/selected-tag-chips.tsx` を新規作成
    - 選択済みタグをチップ一覧で表示、各チップに削除ボタン（×）付き
    - `aria-live="polite"` でフィルタリング結果件数をスクリーンリーダーに通知
    - _Requirements: 3.2, 3.4, 7.5, 7.6_
  - [x] 4.5 TagChip のコンポーネントテストを作成する
    - `packages/web/src/components/tag-chip.test.tsx` を新規作成
    - ゲーム種類タグとカスタムタグのスタイル差異、onClick/onRemove コールバック
    - ARIA 属性の検証
    - _Requirements: 2.3, 7.5_
  - [x] 4.6 TagSearchInput のコンポーネントテストを作成する
    - `packages/web/src/components/tag-search-input.test.tsx` を新規作成
    - キーボード操作（上下矢印、Enter、Escape）、ドロップダウン開閉
    - ARIA 属性（`role="combobox"` 等）の検証
    - _Requirements: 1.2, 1.3, 3.1, 7.1, 7.2, 7.3, 7.4_

- [x] 5. チェックポイント - テスト実行確認
  - `pnpm test` で全テストが pass することを確認し、ユーザーに質問があれば確認する。

- [x] 6. 既存コンポーネント（GameCard, GameList）を拡張し、全体を結合する
  - [x] 6.1 GameCard にタグチップ表示を追加する
    - `packages/web/src/components/game-card.tsx` を修正
    - `getGameTags` を使用して対局カード内にタグチップを表示
    - `onTagClick` プロパティを追加し、タグチップクリックでフィルタ追加
    - タグチップは最大3個表示、超過分は「+N」で省略表示
    - E2E タグは非表示
    - _Requirements: 2.1, 6.1, 6.2, 6.3, 6.4_
  - [x] 6.2 GameList にタグ検索機能を統合する
    - `packages/web/src/components/game-list.tsx` を修正
    - `useTagFilter` と `useTagUrlSync` を統合
    - ステータスタブの下、カード一覧の上に TagSearchInput と SelectedTagChips を配置
    - フィルタリング結果が0件の場合「該当する対局がありません」メッセージを表示
    - ステータスタブとタグフィルタの組み合わせ使用に対応
    - _Requirements: 1.1, 3.3, 3.5, 4.1, 4.4, 4.5, 8.1, 8.2, 8.3_
  - [x] 6.3 GameCard の既存テストを更新する
    - `packages/web/src/components/game-card.test.tsx` を修正
    - `tags` フィールドを含むテストデータに更新
    - タグチップ表示、`onTagClick` コールバックのテストを追加
    - _Requirements: 6.1, 6.3, 6.4_
  - [x] 6.4 GameList の既存テストを更新する
    - `packages/web/src/components/game-list.test.tsx` を修正
    - タグ検索機能の統合テスト（TagSearchInput + フィルタリング連携）
    - フィルタリング結果0件時のメッセージ表示テスト
    - _Requirements: 1.1, 3.3, 4.4_

- [x] 7. チェックポイント - テスト実行確認
  - `pnpm test` で全テストが pass することを確認し、ユーザーに質問があれば確認する。

- [x] 8. 画面設計書・ワイヤーフレームを更新する
  - [x] 8.1 画面設計書（`docs/7-screen-design.md`）を更新する
    - トップページセクションに検索窓、タグチップ、ドロップダウンの要素説明を追加
    - レイアウト図にタグ検索エリア（タブの下、カード一覧の上）を反映
    - 対局カード内のタグチップ表示を要素一覧に追加
    - タグ検索に関する状態（検索中、フィルタリング中、結果0件）を状態セクションに追加
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 8.2 ワイヤーフレーム（`docs/wireframes/01-top-page.drawio`）を更新する
    - 検索窓、タグチップ、ドロップダウンの配置を反映
    - 対局カード内のタグチップ表示を反映
    - _Requirements: 9.5, 9.6_

- [x] 9. 最終チェックポイント - 全テスト pass 確認
  - `pnpm test` で全テストが pass することを確認し、ユーザーに質問があれば確認する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP 優先時はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントでインクリメンタルに検証を実施
- プロパティベーステストは fast-check を使用し、正確性プロパティを検証
- ユニットテストは具体例とエッジケースを検証
