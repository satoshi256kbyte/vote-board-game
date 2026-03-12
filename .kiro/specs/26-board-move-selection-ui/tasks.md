# 実装計画: 盤面上での手の選択UI機能

## 概要

盤面上での手の選択UI機能は、ユーザーが対局詳細画面で盤面上のマスを直接クリックして次の一手を選択・投稿できるようにする機能です。既存のBoard_Component（spec 15）を拡張し、インタラクティブな盤面操作を実現します。

実装は段階的に進め、基本的な盤面表示から始めて、合法手の表示、プレビュー機能、アクセシビリティ対応、テストの順に実装します。

## タスク

- [x] 1. ユーティリティ関数の実装
  - [x] 1.1 座標パース・シリアライズ関数の実装
    - `lib/utils/coordinate.ts` を作成
    - `parseCoordinate(coordinate: string): Position | null` を実装
    - `serializeCoordinate(position: Position): string` を実装
    - Zodスキーマでバリデーションを実装
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 1.2 座標変換のユニットテストを作成
    - `lib/utils/coordinate.test.ts` を作成
    - 正常系: 有効な座標のパース・シリアライズ
    - エッジケース: 境界値（0,0）、（7,7）
    - エラーケース: 無効な形式、範囲外の値
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 1.3 座標変換のプロパティベーステストを作成
    - `lib/utils/coordinate.property.test.ts` を作成
    - **Property 11: 座標パーサーの正確性**
    - **Property 12: 座標シリアライザーの正確性**
    - **Property 13: 座標変換のラウンドトリップ**
    - **Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5**

  - [x] 1.4 合法手計算ラッパー関数の実装
    - `lib/utils/legal-moves.ts` を作成
    - `calculateLegalMoves(boardState: BoardState, currentPlayer: 'black' | 'white'): Position[]` を実装
    - `isLegalMove(boardState: BoardState, position: Position, currentPlayer: 'black' | 'white'): boolean` を実装
    - 既存のOthelloゲームロジック（spec 13）を使用
    - _Requirements: 2.1, 2.2_

  - [x] 1.5 合法手計算のユニットテストを作成
    - `lib/utils/legal-moves.test.ts` を作成
    - 正常系: 合法手の計算、個別の手の判定
    - エッジケース: 合法手がゼロの場合、すべてのセルが埋まっている場合
    - _Requirements: 2.1, 2.2_

  - [x] 1.6 合法手計算のプロパティベーステストを作成
    - `lib/utils/legal-moves.property.test.ts` を作成
    - **Property 2: 合法手の計算と表示**
    - **Validates: Requirements 2.1, 2.3, 2.6**

- [x] 2. 基本コンポーネントの実装
  - [x] 2.1 ValidMoveIndicatorコンポーネントの実装
    - `app/games/[gameId]/_components/valid-move-indicator.tsx` を作成
    - 薄い緑色の円を表示
    - ホバー時に濃い緑色に変化
    - アニメーション効果を実装
    - _Requirements: 2.4, 2.5, 12.2_

  - [x] 2.2 ValidMoveIndicatorのユニットテストを作成
    - `app/games/[gameId]/_components/valid-move-indicator.test.tsx` を作成
    - インジケーター表示、ホバー効果のテスト
    - _Requirements: 2.4, 2.5_

  - [x] 2.3 BoardCellコンポーネントの実装
    - `app/games/[gameId]/_components/board-cell.tsx` を作成
    - セルの表示（空、黒石、白石）
    - 合法手インジケーターの表示
    - 選択ハイライトの表示
    - ホバー効果の実装
    - クリックイベントの処理
    - ARIA属性の設定（role="gridcell", aria-label）
    - _Requirements: 1.5, 2.3, 4.1, 4.2, 4.3, 11.3, 11.4, 11.5, 12.1_

  - [x] 2.4 BoardCellのユニットテストを作成
    - `app/games/[gameId]/_components/board-cell.test.tsx` を作成
    - セル表示、クリック処理、ホバー効果のテスト
    - アクセシビリティ属性のテスト
    - _Requirements: 1.5, 2.3, 4.1, 11.3, 11.4, 11.5_

- [x] 3. InteractiveBoardコンポーネントの実装
  - [x] 3.1 InteractiveBoardの基本構造を実装
    - `app/games/[gameId]/_components/interactive-board.tsx` を作成
    - TypeScriptインターフェースでpropsを定義
    - 8x8グリッドの表示
    - 現在の盤面状態の反映
    - レスポンシブなセルサイズ（デスクトップ: 40px、モバイル: 30px）
    - ARIA属性の設定（role="grid", aria-label）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 11.1, 11.2, 14.1, 14.2_

  - [x] 3.2 合法手の計算と表示を実装
    - useMemoで合法手リストをメモ化
    - 合法手のセルにValidMoveIndicatorを表示
    - 合法手がゼロの場合のメッセージ表示
    - _Requirements: 2.1, 2.3, 2.6, 2.7, 10.4_

  - [x] 3.3 セル選択機能を実装
    - useStateで選択されたセルを管理
    - useCallbackでクリックハンドラーをメモ化
    - 合法手のセルのみ選択可能
    - 選択トグル機能（同じセルをクリックで解除）
    - 一度に1つのセルのみ選択可能
    - 親コンポーネントへの座標通知
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.3, 17.1, 17.4_

  - [x] 3.4 選択セルのハイライト表示を実装
    - 青色の枠線（3px）を表示
    - フェードインアニメーション
    - aria-selected属性の設定
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 11.6, 12.4_

  - [x] 3.5 ホバー効果を実装
    - useStateでホバーされたセルを管理
    - セルの背景色変更
    - ValidMoveIndicatorの色変化
    - _Requirements: 12.1, 12.2_

  - [x] 3.6 エラーハンドリングを実装
    - 非合法手クリック時のエラーメッセージ
    - エラーメッセージの自動消去（3秒後）
    - role="alert"属性の設定
    - _Requirements: 9.1, 9.4, 9.5, 9.6, 11.8_

  - [x] 3.7 パフォーマンス最適化を実装
    - React.memoでコンポーネントをメモ化
    - 不要な再レンダリングの防止
    - _Requirements: 10.1, 10.2, 10.3, 10.6_

  - [x] 3.8 InteractiveBoardのユニットテストを作成
    - `app/games/[gameId]/_components/interactive-board.test.tsx` を作成
    - 正常系: 8x8グリッド表示、合法手インジケーター表示、セル選択
    - エッジケース: 合法手がゼロの場合、すべてのセルが埋まっている場合
    - エラーケース: 非合法手クリック
    - インタラクション: クリック、ホバー
    - アクセシビリティ: ARIA属性、role属性
    - _Requirements: 1.3, 1.4, 2.1, 2.3, 3.1, 3.2, 3.3, 9.1, 11.1, 11.2_

  - [x] 3.9 InteractiveBoardのプロパティベーステストを作成
    - `app/games/[gameId]/_components/interactive-board.property.test.tsx` を作成
    - **Property 1: 盤面構造の正確性**
    - **Property 3: セル選択の排他性**
    - **Property 4: 合法手のみ選択可能**
    - **Validates: Requirements 1.3, 1.4, 1.5, 2.1, 2.3, 2.6, 3.1, 3.2, 3.6, 3.7, 9.1**

- [x] 4. チェックポイント - 基本機能の確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 5. MovePreviewコンポーネントの実装
  - [x] 5.1 MovePreviewコンポーネントを実装
    - `app/games/[gameId]/_components/move-preview.tsx` を作成
    - 既存のBoardPreview_Component（spec 23）を使用
    - 選択した手を適用した盤面を表示
    - 裏返される石を視覚的に示す
    - 選択されたセルをハイライト表示
    - 黒石と白石の数を表示
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.2 MovePreviewのユニットテストを作成
    - `app/games/[gameId]/_components/move-preview.test.tsx` を作成
    - プレビュー表示、裏返される石の表示のテスト
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [x] 5.3 MovePreviewのプロパティベーステストを作成
    - **Property 8: プレビューの表示と内容**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

- [-] 6. CandidateFormへの統合
  - [x] 6.1 CandidateFormを更新してInteractiveBoardを統合
    - `app/games/[gameId]/candidates/new/_components/candidate-form.tsx` を更新
    - InteractiveBoardコンポーネントを追加
    - 座標選択のロジックをInteractiveBoardに委譲
    - MovePreviewコンポーネントを追加
    - 座標が選択されていない場合のバリデーションエラー
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 6.2 CandidateFormのユニットテストを更新
    - `app/games/[gameId]/candidates/new/_components/candidate-form.test.tsx` を更新
    - InteractiveBoardとの連携テスト
    - 座標受け取りのテスト
    - バリデーションエラーのテスト
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 6.3 統合テストを作成
    - `app/games/[gameId]/candidates/new/integration.test.tsx` を作成
    - 完全なフォーム送信フロー（盤面でセル選択 → 説明文入力 → 送信 → リダイレクト）
    - Interactive_BoardとCandidate_Formの連携
    - プレビュー表示の統合
    - _Requirements: 6.1, 6.2, 6.3, 6.7_

- [-] 7. チェックポイント - 統合機能の確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [ ] 8. アクセシビリティとキーボード操作の実装
  - [~] 8.1 キーボード操作を実装
    - InteractiveBoardにキーボードナビゲーションを追加
    - 矢印キーでセル間を移動
    - EnterキーまたはSpaceキーでセルを選択
    - Tabキーで盤面全体をスキップ
    - フォーカスされたセルに視覚的インジケーターを表示
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [~] 8.2 ARIA属性を強化
    - 合法手のセルにaria-labelで"選択可能"を追加
    - 選択されたセルにaria-selected="true"を設定
    - エラーメッセージにrole="alert"を設定
    - _Requirements: 11.4, 11.5, 11.6, 11.8_

  - [~] 8.3 視覚的アクセシビリティを確認
    - 最小4.5:1のコントラスト比を確認
    - prefers-reduced-motionを尊重
    - _Requirements: 11.7, 12.5, 12.6_

  - [~] 8.4 アクセシビリティテストを作成
    - InteractiveBoardのアクセシビリティテストを追加
    - キーボードナビゲーションのテスト
    - ARIA属性のテスト
    - _Requirements: 8.1, 8.2, 8.3, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [~] 8.5 プロパティベーステストでARIA属性を検証
    - **Property 9: ARIA属性の正確性**
    - **Validates: Requirements 11.4, 11.5, 11.6**

- [ ] 9. タッチデバイス対応
  - [~] 9.1 タッチイベントのサポートを実装
    - タッチイベントのハンドリング
    - 最小44pxのタッチターゲットサイズ
    - タップ時の視覚的フィードバック
    - ダブルタップズームの防止
    - スワイプジェスチャーの無効化
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [~] 9.2 タッチデバイスのテストを作成
    - タッチイベントのテスト
    - タッチターゲットサイズのテスト
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10. E2Eテストの実装
  - [~] 10.1 E2Eテストを作成
    - `tests/e2e/candidate-submission-interactive.spec.ts` を作成
    - ユーザーが盤面上でセルをクリックして候補を投稿できる
    - 合法手のみが選択可能である
    - 選択したセルのプレビューが表示される
    - バリデーションエラーが表示される
    - 未認証ユーザーは盤面が無効化される
    - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.4, 19.4_

- [~] 11. 最終チェックポイント
  - すべてのテストが通ることを確認
  - アクセシビリティチェックを実施
  - パフォーマンステストを実施
  - ユーザーに質問があれば確認

## 注意事項

- `*` マークのついたタスクはオプションで、より速いMVPのためにスキップ可能です
- 各タスクは特定の要件を参照しており、トレーサビリティを確保しています
- チェックポイントで段階的な検証を行い、問題を早期に発見します
- プロパティベーステストは、fast-checkを使用し、`numRuns: 10-20`、`endOnFailure: true`を設定します
- テストは最低80%のコードカバレッジを目指します
