# Implementation Plan: 投票ボタン・投票状況表示機能

## Overview

投票ボタン・投票状況表示機能は、ユーザーが次の一手候補に投票し、投票状況を視覚的に確認できるUIコンポーネント群です。この実装では、VoteButton、VoteStatusIndicator、VoteConfirmDialog の3つのコンポーネントと、投票APIクライアント関数を作成します。既存の候補一覧表示機能（spec 23）と統合し、認証済みユーザーに投票・投票変更機能を提供します。

## Tasks

- [x] 1. API クライアント関数の実装
  - `lib/api/votes.ts` を作成
  - `createVote` 関数を実装（POST /games/:gameId/turns/:turnNumber/votes）
  - `changeVote` 関数を実装（PUT /games/:gameId/turns/:turnNumber/votes/me）
  - エラーハンドリング（401, 409, 400, 500, ネットワークエラー）を実装
  - TypeScript の型定義を追加
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 1.1 API クライアント関数のユニットテストを作成
  - `lib/api/votes.test.ts` を作成
  - `createVote` の正常系・異常系テストを実装
  - `changeVote` の正常系・異常系テストを実装
  - エラーハンドリングのテストを実装

- [x] 1.2 API クライアント関数のプロパティテストを作成
  - `lib/api/votes.property.test.ts` を作成
  - **Property 7: エラーメッセージの表示**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.4**
  - エラーステータスコードに対して常に適切なメッセージが返されることを検証

- [x] 2. VoteStatusIndicator コンポーネントの実装
  - `components/vote-status-indicator.tsx` を作成
  - 投票済みマーク（✓）と「投票済み」テキストを表示
  - 投票数を表示
  - Tailwind CSS でスタイリング
  - TypeScript の型定義（VoteStatusIndicatorProps）を追加
  - _Requirements: 2.1, 2.2, 2.3, 8.1, 8.2_

- [x] 2.1 VoteStatusIndicator のユニットテストを作成
  - `components/vote-status-indicator.test.tsx` を作成
  - 投票済みマークと投票数の表示をテスト
  - スタイルの適用をテスト

- [x] 2.2 VoteStatusIndicator のプロパティテストを作成
  - `components/vote-status-indicator.property.test.tsx` を作成
  - **Property 2: 投票済みインジケーター表示**
  - **Validates: Requirements 2.1, 2.2, 2.3**
  - 投票済みの場合は常にインジケーターが表示されることを検証

- [x] 3. VoteConfirmDialog コンポーネントの実装
  - `components/vote-confirm-dialog.tsx` を作成（Client Component）
  - shadcn/ui の Dialog コンポーネントを使用
  - 現在の投票先と新しい投票先を表示
  - 確認ボタンとキャンセルボタンを実装
  - ESC キーでダイアログを閉じる機能を実装
  - フォーカストラップを実装
  - TypeScript の型定義（VoteConfirmDialogProps）を追加
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.4, 9.5_

- [x] 3.1 VoteConfirmDialog のユニットテストを作成
  - `components/vote-confirm-dialog.test.tsx` を作成
  - ダイアログの表示・非表示をテスト
  - 確認ボタン・キャンセルボタンのクリックをテスト
  - ESC キーでダイアログが閉じることをテスト
  - フォーカストラップをテスト

- [x] 3.2 VoteConfirmDialog のプロパティテストを作成
  - `components/vote-confirm-dialog.property.test.tsx` を作成
  - **Property 4: 投票変更の確認ダイアログ**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  - 投票変更時は常に確認ダイアログが表示されることを検証

- [x] 4. Checkpoint - 基本コンポーネントの動作確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 5. VoteButton コンポーネントの実装
  - `components/vote-button.tsx` を作成（Client Component）
  - TypeScript の型定義（VoteButtonProps）を追加
  - 未認証時: ボタンを無効化し、ツールチップ「ログインして投票」を表示
  - 未投票時: 「投票する」ボタンを表示
  - 投票済み時: VoteStatusIndicator を表示
  - 他候補に投票済み時: 「投票を変更」ボタン（outline variant）を表示
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2_

- [x] 5.1 VoteButton の投票処理を実装
  - `handleVote` 関数を実装
  - ローディング状態の管理（isLoading）
  - `createVote` API を呼び出し
  - 成功時: `onVoteSuccess` コールバックを実行
  - エラー時: エラーメッセージを表示
  - 楽観的UI更新を実装
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 11.1, 11.3, 12.1, 12.2, 12.3, 13.1, 13.2, 13.3_

- [x] 5.2 VoteButton の投票変更処理を実装
  - `handleVoteChange` 関数を実装
  - VoteConfirmDialog を表示
  - 確認後: `changeVote` API を呼び出し
  - 成功時: `onVoteSuccess` コールバックを実行
  - エラー時: エラーメッセージを表示
  - ローディング状態の管理（「変更中...」）
  - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.4, 5.5, 6.3, 11.2, 11.3_

- [x] 5.3 VoteButton のアクセシビリティ対応
  - aria-label、role 属性を追加
  - キーボード操作（Enter、Space）を実装
  - フォーカスインジケーターを追加（focus:ring-2）
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 5.4 VoteButton のレスポンシブデザイン対応
  - タッチターゲットサイズを最低44px × 44pxに設定
  - モバイル（< 640px）: 全幅表示
  - タブレット（640px - 767px）: 適切なサイズで表示
  - デスクトップ（≥ 768px）: 適切なサイズで表示
  - _Requirements: 10.1, 10.2_

- [x] 5.5 VoteButton のユニットテストを作成
  - `components/vote-button.test.tsx` を作成
  - 未認証時のボタン無効化とツールチップ表示をテスト
  - 未投票時の「投票する」ボタン表示をテスト
  - 投票済み時の VoteStatusIndicator 表示をテスト
  - 他候補に投票済み時の「投票を変更」ボタン表示をテスト
  - 投票処理のテスト（API 呼び出し、成功時の UI 更新）
  - 投票変更処理のテスト（確認ダイアログ表示、API 呼び出し）
  - ローディング状態のテスト
  - エラーハンドリングのテスト

- [x] 5.6 VoteButton のプロパティテストを作成
  - `components/vote-button.property.test.tsx` を作成
  - **Property 1: 認証必須**
  - **Validates: Requirements 1.1, 1.2, 1.3**
  - 未認証時は常にボタンが無効化されることを検証
  - **Property 6: ローディング状態の表示**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 13.1, 13.2, 13.3**
  - 投票処理中は常にボタンが無効化されることを検証

- [x] 6. Checkpoint - VoteButton の動作確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 7. 既存コンポーネントとの統合
  - [x] 7.1 CandidateCard コンポーネントに VoteButton を統合
    - `app/games/[gameId]/_components/candidate-card.tsx` を更新
    - VoteButton コンポーネントをインポート
    - 投票状況（isVoted、hasVotedOther）を計算
    - VoteButton を候補カードに配置
    - `onVoteSuccess` コールバックを実装
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.2 CandidateList コンポーネントに投票成功後の更新処理を追加
    - `app/games/[gameId]/_components/candidate-list.tsx` を更新
    - 投票成功後に候補リストを再取得する処理を追加
    - 投票状況を更新する処理を追加
    - _Requirements: 5.3, 8.2_

- [x] 7.3 統合テストを作成
  - `components/candidate-card.integration.test.tsx` を作成
  - 候補カード全体の投票フローをテスト（投票ボタン → API 呼び出し → UI 更新）
  - 投票変更フローをテスト（投票変更ボタン → 確認ダイアログ → API 呼び出し → UI 更新）
  - エラーケースの統合テスト

- [x] 8. Checkpoint - 統合の動作確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 9. E2E テストの作成
  - [x] 9.1 投票フローの E2E テストを作成
    - `tests/e2e/game/vote-flow.spec.ts` を作成
    - 認証済みユーザーが候補に投票できることをテスト
    - 投票変更フローをテスト
    - 未認証ユーザーが投票できないことをテスト
    - エラーメッセージの表示をテスト

  - [x] 9.2 既存の E2E テストを更新
    - `tests/e2e/game/move-candidates.spec.ts` を更新
    - 投票ボタンの表示をテスト
    - 投票状況インジケーターの表示をテスト

- [x] 10. Final checkpoint - すべてのテストが通ることを確認
  - すべてのユニットテスト、プロパティテスト、統合テスト、E2E テストが通ることを確認
  - ユーザーに質問があれば確認

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- この機能は既存の候補一覧表示機能（spec 23）と投票API（spec 20, 21, 22）に依存します
- すべてのコンポーネントは TypeScript で実装し、strict mode を有効にします
- Tailwind CSS と shadcn/ui を使用してスタイリングします
