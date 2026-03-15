# 実装タスク: 投票締切・集計バッチ

## 概要

`VoteTallyService` を `packages/api/src/services/vote-tally/` に実装し、既存の `batch.ts` ハンドラーに統合する。既存の `AIMoveExecutor` と同じサービスパターン（リポジトリ DI、対局単位のエラー隔離、構造化ログ）に従う。

## タスク

- [x] 1. 型定義と共通ユーティリティの準備
  - [x] 1.1 `packages/api/src/services/vote-tally/types.ts` に `VoteTallyGameResult` と `VoteTallySummary` の型定義を作成する
    - `VoteTallyGameResult`: gameId, status ('success' | 'skipped' | 'failed' | 'passed' | 'finished'), reason?, adoptedCandidateId?, position?
    - `VoteTallySummary`: totalGames, successCount, failedCount, skippedCount, passedCount, finishedCount, results
    - _要件: 6.1_
  - [x] 1.2 `isAITurn` 関数を `packages/api/src/lib/game-utils.ts` に共通ユーティリティとして抽出する
    - `packages/api/src/services/ai-move-executor/prompt-builder.ts` から `isAITurn` を移動
    - `prompt-builder.ts` は `game-utils.ts` から re-export して既存コードの互換性を維持
    - _要件: 8.1_
  - [x] 1.3 `determineWinner` 関数を `packages/api/src/lib/game-utils.ts` に純粋関数として実装する
    - Board と aiSide を受け取り、countDiscs で石数を比較して 'AI' | 'COLLECTIVE' | 'DRAW' を返す
    - `AIMoveExecutor.handleGameEnd` 内の勝者判定ロジックもこの関数を使うようにリファクタリング
    - _要件: 4.2_
  - [x] 1.4 `packages/api/src/lib/game-utils.test.ts` に `isAITurn` と `determineWinner` のユニットテストを作成する
    - isAITurn: 偶数ターン+BLACK=AI、奇数ターン+WHITE=AI、それ以外=集合知
    - determineWinner: AI勝ち、集合知勝ち、引き分けの各ケース
    - _要件: 8.1, 4.2_
  - [x] 1.5 `packages/api/src/lib/game-utils.property.test.ts` にプロパティベーステストを作成する
    - **Property 4: AI ターン判定**
    - **検証対象: 要件 8.1**
    - 任意の currentTurn と aiSide に対して、偶数ターン+BLACK=AI、奇数ターン+WHITE=AI であることを検証
    - **Property 2: 勝者決定の正確性**
    - **検証対象: 要件 4.2**
    - 任意の盤面と aiSide に対して、石数の大小関係と返り値の整合性を検証
    - _要件: 8.1, 4.2_

- [x] 2. チェックポイント - 共通ユーティリティのテスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [x] 3. VoteTallyService のコアロジック実装
  - [x] 3.1 `packages/api/src/services/vote-tally/index.ts` に `VoteTallyService` クラスを作成する
    - コンストラクタで GameRepository, CandidateRepository, MoveRepository を DI で受け取る
    - `parseBoardState` メソッドを実装（AIMoveExecutor と同じパースロジック）
    - _要件: 7.3_
  - [x] 3.2 `findWinningCandidate` メソッドを実装する
    - 候補リストを voteCount 降順、同票時は createdAt 昇順でソート
    - ソート後の先頭要素を返す（空リストの場合は null）
    - 全候補の voteCount が 0 でも同じロジックで最古の候補を採用
    - _要件: 2.1, 2.3, 2.4_
  - [x] 3.3 `packages/api/src/services/vote-tally/vote-tally.property.test.ts` に `findWinningCandidate` のプロパティベーステストを作成する
    - **Property 1: 最多得票候補の決定**
    - **検証対象: 要件 2.1, 2.3**
    - 任意の空でない候補リストに対して、返された候補の voteCount がリスト内最大であること
    - 同票時は createdAt が最も古い候補であること
    - _要件: 2.1, 2.3_
  - [x] 3.4 `processGame` メソッドを実装する
    - AI ターン判定（isAITurn）→ スキップ
    - boardState パース → 失敗時スキップ
    - 集合知側の合法手確認 → なければパス処理 or 対局終了
    - 候補取得（listByTurn）→ なければスキップ
    - 投票締切（closeVoting）
    - 最多得票候補の特定（findWinningCandidate）
    - 候補を ADOPTED に更新（markAsAdopted）
    - position パース → Othello Engine で盤面更新（executeMove）
    - Move レコード作成（playedBy: 'COLLECTIVE'）
    - Game の boardState と currentTurn 更新
    - 対局終了判定（shouldEndGame）→ 終了処理
    - 構造化ログ出力（JSON 形式、type フィールドで分類）
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.2, 8.1, 8.2_
  - [x] 3.5 `tallyVotes` メソッドを実装する
    - Game_Repository から全 Active_Game を取得
    - 各対局に対して processGame を実行（try-catch でエラー隔離）
    - 処理結果のサマリーを集計して返却
    - 開始・完了の構造化ログ出力
    - _要件: 1.1, 6.1, 6.2, 6.3_
  - [x] 3.6 `packages/api/src/services/vote-tally/vote-tally.property.test.ts` にサマリー集計のプロパティベーステストを追加する
    - **Property 3: サマリーの整合性**
    - **検証対象: 要件 6.1**
    - 任意の VoteTallyGameResult 配列に対して、totalGames = 配列長、各カウントの合計 = totalGames であること
    - _要件: 6.1_

- [x] 4. チェックポイント - VoteTallyService のテスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [x] 5. VoteTallyService のユニットテストと batch.ts 統合
  - [x] 5.1 `packages/api/src/services/vote-tally/vote-tally.test.ts` に VoteTallyService のユニットテストを作成する
    - 正常系: 候補あり → 投票締切 → 最多得票候補採用 → 盤面更新 → success
    - AI ターンのスキップ → skipped
    - 候補なしのスキップ → skipped
    - パス処理（集合知側に合法手なし、AI側にあり）→ passed
    - 両者合法手なし → finished
    - 対局終了判定 → finished
    - closeVoting 失敗時のエラー隔離 → failed（他の対局は継続）
    - 無効な position → failed
    - boardState パース失敗 → skipped
    - 複数対局の処理とサマリーの正確性
    - リポジトリと Othello Engine 関数をモック
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 8.1, 8.2_
  - [x] 5.2 `packages/api/src/batch.ts` に VoteTallyService を統合する
    - Lambda 実行環境のコールドスタート時に VoteTallyService を初期化
    - 既存の TODO コメント（投票集計処理、次の一手決定処理）を VoteTallyService.tallyVotes() 呼び出しに置き換え
    - VoteTallyService は AIMoveExecutor の前に実行
    - VoteTallyService の失敗時はエラーログを出力し、後続処理（AI 手実行、候補生成、解説生成）を継続
    - サマリーをログに記録
    - _要件: 7.1, 7.2, 7.3_
  - [x] 5.3 `packages/api/src/batch.test.ts` に batch.ts 統合のユニットテストを作成する
    - VoteTallyService が AIMoveExecutor の前に実行されること
    - VoteTallyService の失敗時に後続処理が継続すること
    - _要件: 7.1, 7.2_

- [x] 6. 最終チェックポイント - 全テスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## 備考

- `*` マーク付きのタスクはオプションであり、MVP を優先する場合はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保している
- チェックポイントで段階的に検証を行い、問題を早期に発見する
- プロパティベーステストは設計書の正当性プロパティ（Property 1〜4）に対応する
- ユニットテストはエッジケースとエラー条件を検証する
