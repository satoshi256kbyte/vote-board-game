# タスク: 対局解説生成 (game-commentary-generation)

## 1. 型定義とインターフェース

- [x] 1.1 `packages/api/src/services/commentary-generator/types.ts` を作成し、`AICommentaryResponse`、`ParsedCommentary`、`CommentaryParseResult`、`CommentaryGameResult`、`CommentaryProcessingSummary` の型定義を実装する
  - Requirements: 4.6, 7.2, 7.4

## 2. CommentaryRepository の実装

- [x] 2.1 `packages/api/src/lib/dynamodb/repositories/commentary.ts` を作成し、`listByGame`、`getByGameAndTurn`、`create` メソッドを実装する
  - Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
- [x] 2.2 `packages/api/src/lib/dynamodb/repositories/index.ts` に `CommentaryRepository` のエクスポートを追加する
- [x] 2.3 `packages/api/src/lib/dynamodb/repositories/commentary.test.ts` を作成し、CommentaryRepository のユニットテストを実装する（listByGame、getByGameAndTurn、create のモックテスト、entityType・createdAt・PK・SK の検証）

## 3. PromptBuilder の実装

- [x] 3.1 `packages/api/src/services/commentary-generator/prompt-builder.ts` を作成し、`formatBoard`、`formatMoveHistory`、`buildCommentaryPrompt`、`getCommentarySystemPrompt` 関数を実装する
  - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
- [x] 3.2 `packages/api/src/services/commentary-generator/__tests__/prompt-builder.test.ts` を作成し、PromptBuilder のユニットテストを実装する（初期盤面の出力検証、システムプロンプトの内容検証、手履歴フォーマット検証）
- [ ] 3.3 `packages/api/src/services/commentary-generator/__tests__/prompt-builder.property.test.ts` を作成し、Property 1（盤面ラウンドトリップ）と Property 2（プロンプト必要情報）のプロパティテストを実装する
  - [x] 3.3.1 Property 1: 盤面状態のラウンドトリップ - `fc.property` で Board をシリアライズ→デシリアライズし等価性を検証
  - [x] 3.3.2 Property 2: プロンプトに必要情報がすべて含まれる - `buildCommentaryPrompt` の出力にグリッド表現、手履歴、石数、手番、AI側/集合知側、500文字制限、JSON要求、直近の手の分析要求、形勢判断要求が含まれることを検証

## 4. ResponseParser の実装

- [x] 4.1 `packages/api/src/services/commentary-generator/response-parser.ts` を作成し、`parseCommentaryResponse`、`truncateContent` 関数を実装する
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
- [x] 4.2 `packages/api/src/services/commentary-generator/__tests__/response-parser.test.ts` を作成し、ResponseParser のユニットテストを実装する（有効JSON、不正JSONフォールバック、空content、500文字超過切り詰め、マークダウンコードブロック除去）
- [ ] 4.3 `packages/api/src/services/commentary-generator/__tests__/response-parser.property.test.ts` を作成し、Property 3〜4 のプロパティテストを実装する
  - [x] 4.3.1 Property 3: 解説文の長さ不変条件 - 任意の文字列に対して `truncateContent` の結果が500文字以内であることを検証
  - [x] 4.3.2 Property 4: 解説パースのラウンドトリップ - 有効な解説文をJSON形式にフォーマットし再パースして等価性を検証

## 5. CommentaryGenerator の実装

- [x] 5.1 `packages/api/src/services/commentary-generator/index.ts` を作成し、CommentaryGenerator クラスを実装する（generateCommentaries、processGame、getMoveHistory メソッド）
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4
- [ ] 5.2 `packages/api/src/services/commentary-generator/__tests__/commentary-generator.test.ts` を作成し、CommentaryGenerator の統合テストを実装する（モック使用：正常系、0件対局、currentTurn==0スキップ、既存解説スキップ、パース失敗スキップ、Bedrockエラー、DB保存失敗、フィールド値検証、トークン使用量ログ）
  - [x] 5.2.1 Property 5: 処理サマリーの整合性 - successCount + failedCount + skippedCount == totalGames を検証

## 6. batch.ts の統合

- [x] 6.1 `packages/api/src/batch.ts` を修正し、CommentaryGenerator のインスタンス生成と `generateCommentaries()` 呼び出しを CandidateGenerator の後に追加する。CommentaryGenerator の処理失敗時はエラーをログに記録し、バッチ処理全体を失敗として扱わない
  - Requirements: 9.1, 9.2, 9.3, 9.4
