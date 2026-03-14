# タスク: 次の一手候補生成 (move-candidate-generation)

## 1. 型定義とインターフェース

- [ ] 1.1 `packages/api/src/services/candidate-generator/types.ts` を作成し、`AIResponseCandidate`、`AIResponse`、`ParsedCandidate`、`ParseResult`、`GameProcessingResult`、`ProcessingSummary` の型定義を実装する
  - Requirements: 4.7, 6.2, 6.4

## 2. PromptBuilder の実装

- [ ] 2.1 `packages/api/src/services/candidate-generator/prompt-builder.ts` を作成し、`formatBoard`、`buildPrompt`、`getSystemPrompt` 関数を実装する
  - Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
- [ ] 2.2 `packages/api/src/services/candidate-generator/__tests__/prompt-builder.test.ts` を作成し、PromptBuilder のユニットテストを実装する（初期盤面の出力検証、システムプロンプトの内容検証）
- [ ] 2.3 `packages/api/src/services/candidate-generator/__tests__/prompt-builder.property.test.ts` を作成し、Property 1（盤面ラウンドトリップ）と Property 2（プロンプト必要情報）のプロパティテストを実装する
  - [ ] 2.3.1 Property 1: 盤面状態のラウンドトリップ - `fc.property` で Board をシリアライズ→デシリアライズし等価性を検証
  - [ ] 2.3.2 Property 2: プロンプトに必要情報がすべて含まれる - `buildPrompt` の出力にグリッド表現、合法手、手番、候補数3、200文字制限、JSON要求が含まれることを検証

## 3. ResponseParser の実装

- [ ] 3.1 `packages/api/src/services/candidate-generator/response-parser.ts` を作成し、`parseAIResponse`、`normalizePosition`、`truncateDescription` 関数を実装する
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
- [ ] 3.2 `packages/api/src/services/candidate-generator/__tests__/response-parser.test.ts` を作成し、ResponseParser のユニットテストを実装する（不正JSON、空配列、不正position除外のエッジケース）
- [ ] 3.3 `packages/api/src/services/candidate-generator/__tests__/response-parser.property.test.ts` を作成し、Property 3〜5 のプロパティテストを実装する
  - [ ] 3.3.1 Property 3: パース結果は合法手のみを含む - 合法手リストとAIレスポンスを生成し、パース結果の各positionが合法手に含まれることを検証
  - [ ] 3.3.2 Property 4: 説明文の長さ不変条件 - 任意の文字列に対して `truncateDescription` の結果が200文字以内であることを検証
  - [ ] 3.3.3 Property 5: 候補パースのラウンドトリップ - 有効な ParsedCandidate をJSON形式にフォーマットし再パースして等価性を検証

## 4. CandidateGenerator の実装

- [ ] 4.1 `packages/api/src/services/candidate-generator/index.ts` を作成し、CandidateGenerator クラスを実装する（generateCandidates、processGame メソッド）
  - Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4
- [ ] 4.2 `packages/api/src/services/candidate-generator/__tests__/candidate-generator.test.ts` を作成し、CandidateGenerator の統合テストを実装する（モック使用：正常系、0件対局、パース失敗スキップ、合法手0件スキップ、Bedrockエラー、DB保存失敗、重複除外、フィールド値検証）
  - [ ] 4.2.1 Property 6: 処理サマリーの整合性 - successCount + failedCount + skippedCount == totalGames を検証
  - [ ] 4.2.2 Property 7: 重複ポジションの除外 - 既存候補と新規候補を生成し、重複除外後に同一ポジションが含まれないことを検証

## 5. batch.ts の統合

- [ ] 5.1 `packages/api/src/batch.ts` を修正し、CandidateGenerator のインスタンス生成と `generateCandidates()` 呼び出しを追加する
  - Requirements: 1.1, 8.1, 8.4
