# タスクリスト: AI手実行サービス (ai-move-execution)

## タスク 1: 型定義とMoveRepository

- [x] 1.1 `packages/api/src/services/ai-move-executor/types.ts` を作成し、AIレスポンス型（`AIMoveAIResponse`）、パース結果型（`AIMoveParseResult`）、手決定結果型（`AIMoveDecision`）、対局処理結果型（`AIMoveGameResult`）、処理サマリー型（`AIMoveProcessingSummary`）を定義する
- [x] 1.2 `packages/api/src/lib/dynamodb/repositories/move.ts` に `MoveRepository` クラスを作成し、`create` メソッド（MoveEntity の保存）と `listByGame` メソッド（対局の手履歴取得）を実装する
- [x] 1.3 `packages/api/src/lib/dynamodb/repositories/index.ts` に `MoveRepository` のエクスポートを追加する
- [x] 1.4 `packages/api/src/lib/dynamodb/repositories/move.test.ts` に MoveRepository のユニットテストを作成する

## タスク 2: プロンプト構築モジュール

- [x] 2.1 `packages/api/src/services/ai-move-executor/prompt-builder.ts` を作成し、`formatBoard`、`buildAIMovePrompt`、`getAIMoveSystemPrompt`、`isAITurn` 関数を実装する
- [x] 2.2 `packages/api/src/services/ai-move-executor/__tests__/prompt-builder.test.ts` にユニットテストを作成する（具体的な盤面でのプロンプト構築、システムプロンプト内容、手番判定の具体例）
- [x] 2.3 `packages/api/src/services/ai-move-executor/__tests__/prompt-builder.property.test.ts` にプロパティテストを作成する（Property 1: 手番判定の正確性、Property 2: プロンプトに必要情報が含まれる）

## タスク 3: レスポンスパース・バリデーションモジュール

- [x] 3.1 `packages/api/src/services/ai-move-executor/response-parser.ts` を作成し、`parseAIMoveResponse`、`normalizePosition`、`truncateDescription`、`formatAIMoveResponse` 関数を実装する
- [x] 3.2 `packages/api/src/services/ai-move-executor/__tests__/response-parser.test.ts` にユニットテストを作成する（有効なJSON、不正なJSON、マークダウンコードブロック付き、不正な position、description 超過）
- [x] 3.3 `packages/api/src/services/ai-move-executor/__tests__/response-parser.property.test.ts` にプロパティテストを作成する（Property 3: ラウンドトリップ、Property 4: 合法手バリデーション、Property 5: description 切り詰め、Property 6: フォールバック手選択）

## タスク 4: AIMoveExecutor メインサービス

- [x] 4.1 `packages/api/src/services/ai-move-executor/index.ts` に `AIMoveExecutor` クラスを作成し、`executeAIMoves`、`processGame`、`parseBoardState`、`decideMove`、`handleGameEnd`、`handlePass` メソッドを実装する
- [x] 4.2 `packages/api/src/services/ai-move-executor/__tests__/index.test.ts` にユニットテストを作成する（AI手番スキップ、パス処理、対局終了判定、フォールバック、DynamoDBエラー、空リスト、構造化ログ出力）
- [x] 4.3 `packages/api/src/services/ai-move-executor/__tests__/index.property.test.ts` にプロパティテストを作成する（Property 7: 盤面シリアライズラウンドトリップ、Property 8: currentTurn インクリメント、Property 9: MoveEntity フィールド正確性、Property 10: 勝者決定の正確性、Property 11: パス時盤面不変性、Property 12: 障害分離）

## タスク 5: バッチ処理への統合

- [x] 5.1 `packages/api/src/batch.ts` に `AIMoveExecutor` のインポートと初期化を追加し、投票集計後・候補生成前に `executeAIMoves()` を呼び出す処理を追加する（エラー時は後続処理を継続）
