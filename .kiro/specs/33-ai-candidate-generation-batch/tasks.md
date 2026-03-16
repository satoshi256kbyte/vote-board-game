# 実装タスク: AI 候補生成バッチ

## 概要

既存の `CandidateGenerator` に集合知側の手番判定ロジックを追加し、`batch.ts` の CandidateGenerator 呼び出しを try-catch で囲んでエラー隔離を実現する。既存の重複候補防止・合法手チェック・投票期限設定のロジックが正しく動作していることをテストで検証する。

## タスク

- [ ] 1. CandidateGenerator に手番判定ロジックを追加
  - [x] 1.1 `packages/api/src/services/candidate-generator/index.ts` の `processGame` メソッドに手番判定を追加する
    - `game-utils.ts` の `isAITurn` 関数をインポート
    - boardState パースの前に、次のターン（currentTurn + 1）が AI 側の手番かチェック
    - AI 側の手番の場合は `{ status: 'skipped', reason: 'Next turn is AI turn' }` を返す
    - スキップ理由を構造化ログに記録
    - _要件: 1.1, 1.2, 1.3_

  - [x] 1.2 `packages/api/src/services/candidate-generator/__tests__/candidate-generator.test.ts` に手番判定のユニットテストを追加する
    - 次ターンが AI 手番の場合のスキップ
    - 次ターンが集合知手番の場合の候補生成実行
    - _要件: 1.1, 1.2_

  - [x] 1.3 `packages/api/src/services/candidate-generator/__tests__/candidate-generator.property.test.ts` にプロパティベーステストを作成する
    - **Property 1: 手番に基づく候補生成フィルタリング**
    - **検証対象: 要件 1.1, 1.2**
    - 任意の currentTurn（自然数）と aiSide（'BLACK' | 'WHITE'）に対して、次ターン（currentTurn + 1）が AI 手番なら候補生成がスキップされ、集合知手番なら候補生成が実行されることを検証
    - `numRuns: 10`, `endOnFailure: true`

- [x] 2. batch.ts の CandidateGenerator エラー隔離と構造化ログ
  - [x] 2.1 `packages/api/src/batch.ts` の CandidateGenerator 呼び出しを try-catch で囲む
    - `candidateGenerator.generateCandidates()` を try-catch で囲む
    - 成功時: `BATCH_CANDIDATE_GENERATION_COMPLETED` タイプの構造化ログ（JSON）を出力
    - 失敗時: `BATCH_CANDIDATE_GENERATION_FAILED` タイプのエラーログを出力し、後続の CommentaryGenerator を継続
    - VoteTallyService、AIMoveExecutor、CommentaryGenerator と同じエラー隔離パターンに統一
    - _要件: 2.1, 2.2, 2.3, 3.2_

  - [x] 2.2 `packages/api/src/batch.ts` の全サービスのログ出力を構造化ログ（JSON 形式）に統一する
    - VoteTallyService、AIMoveExecutor、CommentaryGenerator のサマリーログも JSON.stringify で出力
    - バッチ全体の完了ログを `BATCH_PROCESS_COMPLETED` タイプで出力
    - _要件: 3.3, 5.1, 5.2, 5.3_

  - [x] 2.3 `packages/api/src/batch.test.ts` に CandidateGenerator エラー隔離のテストを追加する
    - CandidateGenerator の失敗時に CommentaryGenerator が実行されること
    - AIMoveExecutor の失敗時に CandidateGenerator と CommentaryGenerator が実行されること
    - 全サービスの実行順序が VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator であること
    - _要件: 2.1, 2.2, 3.1, 3.2_

  - [x] 2.4 `packages/api/src/batch.property.test.ts` にバッチハンドラーのプロパティベーステストを作成する
    - **Property 2: バッチハンドラーのサービスエラー隔離**
    - **検証対象: 要件 2.1, 2.2, 3.2**
    - 4つのサービスの成功/失敗パターン（2^4 = 16通り）を生成し、失敗サービスの後続サービスが全て実行されることを検証
    - **Property 3: バッチ処理の実行順序保証**
    - **検証対象: 要件 3.1**
    - 任意のバッチ実行において、呼び出し順序が VoteTallyService → AIMoveExecutor → CandidateGenerator → CommentaryGenerator であることを検証
    - `numRuns: 10`, `endOnFailure: true`

- [x] 3. チェックポイント - エラー隔離と手番判定の確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 4. 既存機能のテスト検証（CandidateGenerator）
  - [x] 4.1 `packages/api/src/services/candidate-generator/__tests__/candidate-generator.test.ts` に既存機能のユニットテストを追加する
    - 合法手なし時のスキップ（AI プロンプト構築が呼ばれないこと）
    - 重複候補のフィルタリング（既存候補と同一ポジションの候補が保存されないこと）
    - 候補保存時の votingDeadline が翌日 JST 23:59:59.999 であること
    - 候補の turnNumber が currentTurn + 1 であること
    - 候補の createdBy が "AI" であること
    - BedrockService エラー時の失敗処理と次の対局の継続
    - boardState パース失敗時のスキップ
    - _要件: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 10.1, 10.3_

  - [x] 4.2 `packages/api/src/services/candidate-generator/__tests__/candidate-generator.property.test.ts` に既存機能のプロパティベーステストを追加する
    - **Property 5: 合法手なし時の候補生成スキップ**
    - **検証対象: 要件 6.1, 6.2**
    - 合法手なしの盤面に対して、CandidateGenerator が AI 呼び出しをスキップすることを検証
    - **Property 6: 重複候補のフィルタリング**
    - **検証対象: 要件 7.1, 7.2, 7.3**
    - 既存候補セットと新規候補セットを生成し、重複ポジションの候補が除外されることを検証
    - **Property 7: 投票期限の計算**
    - **検証対象: 要件 8.1**
    - 任意の実行時刻に対して、calculateVotingDeadline の結果が翌日 JST 23:59:59.999 であることを検証
    - **Property 8: 候補メタデータの正確性**
    - **検証対象: 要件 8.2, 8.3**
    - 任意の currentTurn に対して、保存される候補の turnNumber が currentTurn + 1、createdBy が "AI" であることを検証
    - `numRuns: 10`, `endOnFailure: true`

- [ ] 5. 既存機能のテスト検証（CommentaryGenerator）
  - [x] 5.1 `packages/api/src/services/commentary-generator/__tests__/commentary-generator.test.ts` に既存機能のユニットテストを追加する
    - 既存解説がある場合のスキップ
    - currentTurn が 0 の場合のスキップ
    - BedrockService エラー時の失敗処理と次の対局の継続
    - boardState パース失敗時のスキップ
    - _要件: 9.1, 9.2, 9.3, 10.2, 10.4_

  - [x] 5.2 `packages/api/src/services/commentary-generator/__tests__/commentary-generator.property.test.ts` にプロパティベーステストを作成する
    - **Property 9: 解説の重複生成防止**
    - **検証対象: 要件 9.1, 9.2, 9.3**
    - 既存解説の有無を生成し、既存解説がある場合にスキップされることを検証
    - **Property 10: 対局単位のエラー隔離**
    - **検証対象: 要件 10.1, 10.2**
    - 複数の対局と失敗パターンを生成し、失敗した対局以外が正常に処理されることを検証
    - `numRuns: 10`, `endOnFailure: true`

- [x] 6. チェックポイント - 既存機能のテスト検証確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 7. 処理サマリーのカウント整合性テスト
  - [x] 7.1 `packages/api/src/services/candidate-generator/__tests__/candidate-generator.property.test.ts` にサマリー整合性のプロパティベーステストを追加する
    - **Property 4: 処理サマリーのカウント整合性（CandidateGenerator）**
    - **検証対象: 要件 5.1**
    - 任意の GameProcessingResult 配列に対して、totalGames = 配列長、successCount + failedCount + skippedCount = totalGames であることを検証
    - `numRuns: 10`, `endOnFailure: true`

  - [x] 7.2 `packages/api/src/services/commentary-generator/__tests__/commentary-generator.property.test.ts` にサマリー整合性のプロパティベーステストを追加する
    - **Property 4: 処理サマリーのカウント整合性（CommentaryGenerator）**
    - **検証対象: 要件 5.2**
    - 任意の CommentaryGameResult 配列に対して、totalGames = 配列長、successCount + failedCount + skippedCount = totalGames であることを検証
    - `numRuns: 10`, `endOnFailure: true`

- [x] 8. 最終チェックポイント - 全テスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP を優先する場合はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保している
- チェックポイントで段階的に検証を行い、問題を早期に発見する
- プロパティベーステストは設計書の正当性プロパティ（Property 1〜10）に対応する
- ユニットテストはエッジケースとエラー条件を検証する
- 主な実装変更は タスク 1.1（手番判定追加）と タスク 2.1〜2.2（batch.ts エラー隔離・構造化ログ）のみ。残りは既存機能のテスト検証
