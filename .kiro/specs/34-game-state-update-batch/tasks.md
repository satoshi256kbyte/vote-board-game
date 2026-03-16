# 実装タスク: 対局状態更新バッチ

## 概要

`GameStateUpdater` を `packages/api/src/services/game-state-updater/` に実装し、既存の `batch.ts` ハンドラーに最終ステップとして統合する。既存の CandidateGenerator や CommentaryGenerator と同じサービスパターン（リポジトリ DI、対局単位のエラー隔離、構造化ログ）に従う。共通ユーティリティ（`game-utils.ts` の `isAITurn`、`determineWinner`）と Othello Engine（`getLegalMoves`、`countDiscs`）を活用する。

## タスク

- [x] 1. GameStateUpdater の型定義とサービス骨格の作成
  - [x] 1.1 `packages/api/src/services/game-state-updater/index.ts` に型定義とクラス骨格を作成する
    - `GameStateUpdateResult` インターフェース（gameId, status: 'ok' | 'finished' | 'warning' | 'error', reason?, winner?, blackCount?, whiteCount?, hasCandidates?）
    - `GameStateUpdateSummary` インターフェース（totalGames, okCount, finishedCount, warningCount, errorCount, results）
    - `GameStateUpdater` クラスのコンストラクタ（GameRepository, CandidateRepository を DI）
    - `validateBoardState` メソッド: boardState 文字列を JSON パースし、8x8 の数値配列を含む場合のみ Board を返す。無効な場合は null を返す
    - `updateGameStates` メソッドの骨格（Active Game 取得 → 各対局を processGame → サマリー集計）
    - `processGame` メソッドの骨格（盤面検証 → 連続パス検出 → 候補チェック）
    - _要件: 1.1, 2.1, 3.1, 4.1, 6.1, 6.3_

  - [x] 1.2 `processGame` メソッドのコアロジックを実装する
    - 盤面パース: `validateBoardState` で boardState を検証。失敗時は `GAME_STATE_INVALID_BOARD_ERROR` ログを出力し status: `'error'` を返す
    - 連続パス検出: `getLegalMoves` で黒・白の両方の合法手を確認。両者合法手なしの場合、`countDiscs` で石数カウント、`determineWinner` で勝者判定、`gameRepository.finish` で対局終了。`GAME_STATE_CONSECUTIVE_PASS` ログを出力し status: `'finished'` を返す
    - AI ターン判定: `isAITurn` で AI ターンの場合、候補チェックをスキップ。`GAME_STATE_AI_TURN_SKIP` ログを出力し status: `'ok'` を返す
    - 候補存在チェック: `candidateRepository.listByTurn` で候補を確認。候補なしの場合 `GAME_STATE_NO_CANDIDATES_WARNING` ログを出力し status: `'warning'` を返す。候補ありの場合 status: `'ok'` を返す
    - エラーハンドリング: try-catch で対局単位のエラーを隔離。エラー時は status: `'error'` を返す
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x] 1.3 `updateGameStates` メソッドのサマリー集計ロジックを実装する
    - `gameRepository.listByStatus('ACTIVE')` で全アクティブ対局を取得
    - 各対局に対して `processGame` を実行（try-catch でエラー隔離）
    - 処理結果から okCount, finishedCount, warningCount, errorCount を集計
    - `GAME_STATE_UPDATE_START` と `GAME_STATE_UPDATE_COMPLETE` の構造化ログを出力
    - _要件: 4.1, 4.2, 6.1, 6.3_

- [x] 2. GameStateUpdater のユニットテスト
  - [x] 2.1 `packages/api/src/services/game-state-updater/index.test.ts` にユニットテストを作成する
    - 正常な盤面で対局継続（候補あり）→ status: `'ok'`
    - 連続パス検出時の finish 呼び出しと勝者判定 → status: `'finished'`
    - 無効な boardState（JSON パース失敗）→ status: `'error'`
    - 無効な boardState（非 8x8 配列）→ status: `'error'`
    - AI ターンの対局で候補チェックがスキップされること → status: `'ok'`
    - 候補なし時の警告 → status: `'warning'`
    - finish 失敗時のエラー処理 → status: `'error'`
    - 複数対局処理時のエラー隔離（1対局の失敗が他に影響しない）
    - サマリーの totalGames と各カウントの整合性
    - 構造化ログの出力検証（console.log / console.error / console.warn のモック）
    - GameRepository, CandidateRepository, Othello Engine 関数をモック
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 4.1, 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x] 2.2 `packages/api/src/services/game-state-updater/game-state-updater.property.test.ts` にプロパティベーステストを作成する
    - **Property 1: 連続パス検出と対局終了**
    - **検証対象: 要件 1.1, 1.2, 1.3**
    - 任意の 8x8 盤面（両者合法手なし）と aiSide を生成し、`determineWinner` の結果と `finish` の呼び出し引数が石数に基づく勝者と一致することを検証
    - **Property 3: 盤面状態の検証**
    - **検証対象: 要件 3.1, 3.3**
    - 任意の文字列を生成し、`validateBoardState` が有効な JSON かつ 8x8 配列の場合のみ Board を返すことを検証
    - **Property 4: 処理サマリーのカウント整合性**
    - **検証対象: 要件 4.1, 6.3**
    - 任意の GameStateUpdateResult 配列を生成し、totalGames = 配列長、okCount + finishedCount + warningCount + errorCount = totalGames を検証
    - **Property 6: 対局単位のエラー隔離**
    - **検証対象: 要件 6.1**
    - 複数の対局と失敗パターンを生成し、失敗した対局以外が正常に処理され、サマリーが返却されることを検証
    - **Property 7: AI ターン時の候補チェックスキップと検証実行**
    - **検証対象: 要件 7.1, 7.3**
    - 任意の currentTurn と aiSide の組み合わせを生成し、AI ターンの場合に候補チェックがスキップされ、盤面検証と連続パス検出は実行されることを検証
    - `numRuns: 10`, `endOnFailure: true`

- [x] 3. チェックポイント - GameStateUpdater のテスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [x] 4. batch.ts への統合
  - [x] 4.1 `packages/api/src/batch.ts` に GameStateUpdater を統合する
    - GameStateUpdater のインポートと初期化（Lambda コールドスタート時に1度だけ）
    - CommentaryGenerator の後（最終ステップ）に `gameStateUpdater.updateGameStates()` を呼び出し
    - try-catch でエラー隔離: 成功時は `BATCH_GAME_STATE_UPDATE_COMPLETED` ログ、失敗時は `BATCH_GAME_STATE_UPDATE_FAILED` ログ
    - 実行順序: VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator → GameStateUpdater
    - _要件: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.2 `packages/api/src/batch.test.ts` に GameStateUpdater 統合のテストを追加する
    - GameStateUpdater が CommentaryGenerator の後に実行されること
    - GameStateUpdater の失敗時にエラーログが出力されること
    - 5つのサービスの実行順序が VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator → GameStateUpdater であること
    - _要件: 5.1, 5.2, 5.4_

  - [x] 4.3 `packages/api/src/batch.property.test.ts` にバッチハンドラーのプロパティベーステストを追加する
    - **Property 5: バッチ処理の実行順序**
    - **検証対象: 要件 5.1, 5.4**
    - 5つのサービスの成功/失敗パターン（2^5 = 32通り）を生成し、呼び出し順序が VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator → GameStateUpdater であることを検証
    - **Property 2: 候補存在チェックとサマリー反映**
    - **検証対象: 要件 2.1, 2.3**
    - 任意のアクティブ対局セット（候補あり/なし混在）を生成し、サマリーの warningCount が候補なし対局数と一致することを検証
    - `numRuns: 10`, `endOnFailure: true`

- [x] 5. 最終チェックポイント - 全テスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP を優先する場合はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保している
- チェックポイントで段階的に検証を行い、問題を早期に発見する
- プロパティベーステストは設計書の正当性プロパティ（Property 1〜7）に対応する
- ユニットテストはエッジケースとエラー条件を検証する
- 共通ユーティリティ（`isAITurn`、`determineWinner`）と Othello Engine は既存のものを使用し、新規作成しない
