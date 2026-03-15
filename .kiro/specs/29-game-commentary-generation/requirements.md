# 要件定義書

## はじめに

対局解説生成ロジックは、投票対局アプリケーションにおいて、対局の盤面に表示するAIによる対局内容の解説を生成するバックエンド機能である。日次バッチ処理の一環として、投票集計・次の一手決定後に、ここまでの対局の流れを分析し、初心者にもわかりやすい解説文を Amazon Bedrock (Nova Pro) を使って自動生成し、DynamoDB に保存する。解説はターンごとに生成され、対局の進行状況・戦略的な意味・盤面の形勢を含む。

## 用語集

- **CommentaryGenerator**: 対局解説生成サービス - 盤面状態の取得、手履歴の収集、プロンプト構築、AI呼び出し、解説保存を統括するサービス
- **BedrockService**: Bedrock統合サービス - AWS Bedrock (Nova Pro) を使用したテキスト生成機能を提供する既存サービス（spec 27 で実装済み）
- **GameRepository**: ゲームリポジトリ - DynamoDB からゲームエンティティを取得するリポジトリ（既存）
- **CommentaryRepository**: 解説リポジトリ - DynamoDB に解説エンティティ（Commentary）を作成・取得するリポジトリ
- **OthelloLogic**: オセロロジック - 盤面解析、石数カウント、合法手算出を行うモジュール（既存）
- **Board**: 盤面 - 8x8のオセロ盤面の状態を表す2次元配列
- **MoveHistory**: 手履歴 - 対局開始から現在のターンまでの全ての手の記録（MoveEntity の配列）
- **Commentary**: 解説 - AIが生成した対局内容の解説文（CommentaryEntity として DynamoDB に保存）
- **BatchProcess**: バッチ処理 - EventBridge Scheduler により日次で実行される Lambda 関数

## 要件

### 要件 1: アクティブな対局の情報取得

**ユーザーストーリー:** バッチ処理として、アクティブな対局の盤面状態と手履歴を取得したい。AIに正確な対局情報を渡して解説を生成するためである。

#### 受入基準

1. WHEN バッチ処理が開始された時, THE CommentaryGenerator SHALL GameRepository からステータスが "ACTIVE" の全対局を取得する
2. WHEN アクティブな対局が取得された時, THE CommentaryGenerator SHALL 各対局の boardState（JSON文字列）を Board 型にパースする
3. WHEN アクティブな対局が取得された時, THE CommentaryGenerator SHALL 各対局の手履歴（MoveEntity の配列）を DynamoDB から取得する
4. IF boardState のパースに失敗した時, THEN THE CommentaryGenerator SHALL エラーをログに記録し、該当対局の解説生成をスキップする
5. WHEN アクティブな対局が0件の時, THE CommentaryGenerator SHALL 処理を正常終了する
6. WHEN 対局の currentTurn が 0 の時, THE CommentaryGenerator SHALL 該当対局の解説生成をスキップする（手が打たれていないため解説不要）

### 要件 2: 解説生成対象ターンの判定

**ユーザーストーリー:** バッチ処理として、解説が未生成のターンを特定したい。重複生成を防ぎ、最新ターンの解説のみを効率的に生成するためである。

#### 受入基準

1. WHEN 対局情報が取得された時, THE CommentaryGenerator SHALL CommentaryRepository から該当対局の既存解説一覧を取得する
2. THE CommentaryGenerator SHALL 対局の currentTurn に対応する解説が既に存在するか確認する
3. WHEN currentTurn の解説が既に存在する時, THE CommentaryGenerator SHALL 該当対局の解説生成をスキップし、ログに記録する
4. THE CommentaryGenerator SHALL 解説が未生成の currentTurn に対してのみ解説を生成する

### 要件 3: 解説用AIプロンプトの構築

**ユーザーストーリー:** バッチ処理として、盤面状態と手履歴を含む構造化されたプロンプトを構築したい。AIが対局の流れを正確に分析し、わかりやすい解説を生成できるようにするためである。

#### 受入基準

1. THE CommentaryGenerator SHALL 現在の盤面状態を人間が読める形式（8x8のグリッド表現）でプロンプトに含める
2. THE CommentaryGenerator SHALL 手履歴（各ターンの手番、位置、実行者）をプロンプトに含める
3. THE CommentaryGenerator SHALL 現在の石数（黒・白それぞれ）をプロンプトに含める
4. THE CommentaryGenerator SHALL 現在の手番（黒または白）をプロンプトに含める
5. THE CommentaryGenerator SHALL AI側と集合知側のどちらがどの色かをプロンプトに含める
6. THE CommentaryGenerator SHALL 解説文の最大文字数として500文字を指定する
7. THE CommentaryGenerator SHALL 初心者にもわかりやすい解説を要求する
8. THE CommentaryGenerator SHALL システムプロンプトにオセロの解説者としての役割を設定する
9. THE CommentaryGenerator SHALL 直近の手（最新ターン）の戦略的意味の分析を要求する
10. THE CommentaryGenerator SHALL 現在の形勢判断を要求する

### 要件 4: AIレスポンスのパースとバリデーション

**ユーザーストーリー:** バッチ処理として、AIのレスポンスを安全にパースし検証したい。不正なデータが DynamoDB に保存されることを防ぐためである。

#### 受入基準

1. WHEN AIからレスポンスを受信した時, THE CommentaryGenerator SHALL レスポンスをJSON形式としてパースする
2. IF JSONパースに失敗した時, THEN THE CommentaryGenerator SHALL レスポンス全体をプレーンテキストの解説として扱う
3. THE CommentaryGenerator SHALL 解説文（content）が空でないことを検証する
4. IF 解説文が空の時, THEN THE CommentaryGenerator SHALL 該当対局の解説生成を失敗として扱う
5. WHEN 解説文が500文字を超過する時, THE CommentaryGenerator SHALL 500文字で切り詰める
6. THE CommentaryGenerator SHALL パース結果として content（文字列）を含むオブジェクトを返す
7. FOR ALL 有効な解説文, パースしてからフォーマットし直してから再度パースした結果は元の解説文と等価である（ラウンドトリップ特性）

### 要件 5: 解説の DynamoDB 保存

**ユーザーストーリー:** バッチ処理として、生成された解説を DynamoDB に保存したい。ユーザーが対局画面で解説を閲覧できるようにするためである。

#### 受入基準

1. WHEN 有効な解説が生成された時, THE CommentaryGenerator SHALL CommentaryRepository の create メソッドを使用して解説を保存する
2. THE CommentaryGenerator SHALL 解説の generatedBy を "AI" に設定する
3. THE CommentaryGenerator SHALL 解説の turnNumber を対局の currentTurn に設定する
4. THE CommentaryGenerator SHALL 解説の PK を `GAME#<gameId>` 形式で設定する
5. THE CommentaryGenerator SHALL 解説の SK を `COMMENTARY#<turnNumber>` 形式で設定する
6. IF 解説の保存に失敗した時, THEN THE CommentaryGenerator SHALL エラーをログに記録する

### 要件 6: 解説取得リポジトリ

**ユーザーストーリー:** 開発者として、対局の解説を DynamoDB から取得するリポジトリを実装したい。解説の保存・取得・重複チェックを一元管理するためである。

#### 受入基準

1. THE CommentaryRepository SHALL 指定された gameId の全解説を取得するメソッドを提供する
2. THE CommentaryRepository SHALL PK = `GAME#<gameId>`, SK begins_with `COMMENTARY#` のクエリで解説を取得する
3. THE CommentaryRepository SHALL 指定された gameId と turnNumber の解説を1件取得するメソッドを提供する
4. THE CommentaryRepository SHALL 解説エンティティを作成するメソッドを提供する
5. THE CommentaryRepository SHALL 作成時に entityType を "COMMENTARY" に設定する
6. THE CommentaryRepository SHALL 作成時に createdAt を ISO 8601 形式で設定する

### 要件 7: エラーハンドリングと耐障害性

**ユーザーストーリー:** システム運用者として、個別の対局の解説生成失敗が他の対局に影響しないようにしたい。バッチ処理全体の信頼性を確保するためである。

#### 受入基準

1. WHEN 特定の対局の解説生成中にエラーが発生した時, THE CommentaryGenerator SHALL エラーをログに記録し、次の対局の処理を継続する
2. THE CommentaryGenerator SHALL 処理結果（成功数、失敗数、スキップ数）をログに記録する
3. IF BedrockService の呼び出しがエラーを返した時, THEN THE CommentaryGenerator SHALL 該当対局の解説生成を失敗として記録する
4. THE CommentaryGenerator SHALL 全対局の処理完了後に処理サマリーを返す

### 要件 8: ログとモニタリング

**ユーザーストーリー:** システム運用者として、解説生成処理の詳細なログを確認したい。問題の調査と処理状況の把握ができるようにするためである。

#### 受入基準

1. THE CommentaryGenerator SHALL 処理開始時にバッチ処理開始ログを構造化JSON形式で出力する
2. THE CommentaryGenerator SHALL 各対局の処理開始・完了・スキップ・失敗をログに記録する
3. THE CommentaryGenerator SHALL AIへのリクエスト・レスポンスのトークン使用量をログに記録する
4. THE CommentaryGenerator SHALL 処理完了時に処理サマリー（対局数、成功数、失敗数、スキップ数、生成解説数）をログに出力する

### 要件 9: バッチ処理への統合

**ユーザーストーリー:** 開発者として、解説生成処理を既存のバッチ処理（batch.ts）に統合したい。日次バッチの一環として自動実行されるようにするためである。

#### 受入基準

1. THE CommentaryGenerator SHALL 既存の batch.ts の handler 関数内で呼び出される
2. THE CommentaryGenerator SHALL 候補生成処理（CandidateGenerator）の後に実行される
3. THE CommentaryGenerator SHALL BedrockService のインスタンスを CandidateGenerator と共有する
4. IF CommentaryGenerator の処理が失敗した時, THEN THE BatchProcess SHALL エラーをログに記録し、バッチ処理全体を失敗として扱わない
