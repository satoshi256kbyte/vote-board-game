# 要件定義書

## はじめに

AI コンテンツ表示機能は、投票対局アプリケーションのフロントエンド機能で、バックエンドで生成された AI コンテンツ（次の一手候補と対局解説）をユーザーに表示する。WBS 7.2.1「AI 生成候補の表示」と 7.2.2「対局解説の表示」に対応する。

バックエンドの AI 機能（spec 27〜30）は既に完了しており、以下のデータが利用可能である:

- AI が生成した次の一手候補（候補一覧 API 経由、`createdBy: "AI"` で識別）
- AI が生成した対局解説（解説取得 API `GET /games/:gameId/commentary` 経由）

既存の対局詳細画面（spec 15）と候補一覧表示（spec 23）を拡張し、AI 生成コンテンツを適切に表示する。

## 用語集

- **AI_Candidate_Badge**: AI が生成した候補であることを示すバッジコンポーネント
- **Commentary_Section**: 対局解説を表示するセクションコンポーネント
- **Commentary_API_Client**: 解説取得 API と通信するクライアント関数
- **Candidate_Card_Component**: 既存の候補カードコンポーネント（spec 23 で実装済み）
- **Game_Detail_Screen**: 既存の対局詳細画面（spec 15 で実装済み）
- **CommentaryEntity**: DynamoDB に保存された解説エンティティ（gameId, turnNumber, content, generatedBy, createdAt を含む）
- **Client_Component**: クライアント側でレンダリングされる React コンポーネント

## 要件

### 要件 1: AI 生成候補のバッジ表示

**ユーザーストーリー:** ユーザーとして、候補が AI によって生成されたものかユーザーが投稿したものかを区別したい。候補の出所を理解した上で投票判断ができるようにするためである。

#### 受入基準

1. WHEN 候補の source が "ai" の時, THE Candidate_Card_Component SHALL AI_Candidate_Badge を表示する
2. WHEN 候補の source が "user" の時, THE Candidate_Card_Component SHALL AI_Candidate_Badge を表示しない
3. THE AI_Candidate_Badge SHALL "AI生成" というテキストを表示する
4. THE AI_Candidate_Badge SHALL 紫色の背景色（bg-purple-100）と紫色のテキスト色（text-purple-800）を使用する
5. THE AI_Candidate_Badge SHALL 候補カードの投稿者名の横に配置される
6. THE AI_Candidate_Badge SHALL aria-label 属性に "AI が生成した候補" を設定する
7. THE AI_Candidate_Badge SHALL スクリーンリーダーに読み上げられる

### 要件 2: AI 生成候補の投稿者名表示

**ユーザーストーリー:** ユーザーとして、AI 生成候補の投稿者が "AI" と明確に表示されることを確認したい。誰が候補を提案したか一目でわかるようにするためである。

#### 受入基準

1. WHEN 候補の source が "ai" の時, THE Candidate_Card_Component SHALL 投稿者名を "AI" と表示する
2. WHEN 候補の source が "user" の時, THE Candidate_Card_Component SHALL 投稿者のユーザー名を表示する
3. THE Candidate_Card_Component SHALL 既存の postedByUsername フィールドを使用して投稿者名を表示する（バックエンドが createdBy="AI" の場合に "AI" をマッピング済み）

### 要件 3: 対局解説 API クライアント

**ユーザーストーリー:** 開発者として、対局解説を取得する API クライアント関数を実装したい。フロントエンドから解説データを取得できるようにするためである。

#### 受入基準

1. THE Commentary_API_Client SHALL GET /games/:gameId/commentary エンドポイントを呼び出す関数を提供する
2. THE Commentary_API_Client SHALL レスポンスを Commentary 型の配列にマッピングする
3. THE Commentary_API_Client SHALL Commentary 型に turnNumber（数値）、content（文字列）、generatedBy（文字列）、createdAt（文字列）を含める
4. IF API リクエストが失敗した時, THEN THE Commentary_API_Client SHALL エラーをスローする
5. IF API が 404 を返した時, THEN THE Commentary_API_Client SHALL 空の配列を返す
6. THE Commentary_API_Client SHALL 既存の API クライアントパターン（getApiBaseUrl、handleResponse）を再利用する

### 要件 4: 対局解説セクションの表示

**ユーザーストーリー:** ユーザーとして、対局の盤面と一緒に AI による解説を読みたい。対局の流れや戦略を理解できるようにするためである。

#### 受入基準

1. THE Commentary_Section SHALL 対局詳細画面の盤面セクションの下に配置される
2. THE Commentary_Section SHALL 現在のターンに対応する解説を表示する
3. THE Commentary_Section SHALL "AI解説" という見出しを表示する
4. THE Commentary_Section SHALL 解説文（content）を表示する
5. THE Commentary_Section SHALL 解説の生成日時を表示する
6. WHEN 解説が存在しない時, THE Commentary_Section SHALL "この対局の AI 解説はまだありません" メッセージを表示する
7. WHEN 解説の取得中, THE Commentary_Section SHALL スケルトンローダーを表示する
8. IF 解説の取得に失敗した時, THEN THE Commentary_Section SHALL "解説の取得に失敗しました" エラーメッセージを表示する
9. THE Commentary_Section SHALL 既存のプレースホルダー（「この対局のAI解説は準備中です」）を置き換える

### 要件 5: 対局解説のターン切り替え

**ユーザーストーリー:** ユーザーとして、過去のターンの解説も閲覧したい。対局の流れを振り返って理解を深めるためである。

#### 受入基準

1. WHEN 対局に複数ターンの解説が存在する時, THE Commentary_Section SHALL ターン選択 UI を表示する
2. THE ターン選択 UI SHALL 「前のターン」「次のターン」ボタンを提供する
3. THE ターン選択 UI SHALL 現在表示中のターン番号を表示する
4. WHEN 「前のターン」ボタンがクリックされた時, THE Commentary_Section SHALL 1つ前のターンの解説を表示する
5. WHEN 「次のターン」ボタンがクリックされた時, THE Commentary_Section SHALL 1つ次のターンの解説を表示する
6. WHEN 最初のターンの解説を表示中の時, THE 「前のターン」ボタン SHALL 無効化される
7. WHEN 最新のターンの解説を表示中の時, THE 「次のターン」ボタン SHALL 無効化される
8. THE Commentary_Section SHALL デフォルトで最新ターンの解説を表示する

### 要件 6: 対局解説のスタイリング

**ユーザーストーリー:** ユーザーとして、解説が読みやすく表示されることを期待する。快適に解説を読めるようにするためである。

#### 受入基準

1. THE Commentary_Section SHALL 青色系の背景色（bg-blue-50）を使用する
2. THE Commentary_Section SHALL 青色系のボーダー（border-blue-200）を使用する
3. THE Commentary_Section SHALL 解説文を適切な行間（leading-relaxed）で表示する
4. THE Commentary_Section SHALL Tailwind CSS でスタイリングする
5. THE Commentary_Section SHALL デスクトップとモバイルでレスポンシブに表示する
6. THE Commentary_Section SHALL 最小 4.5:1 のコントラスト比を持つ

### 要件 7: 対局詳細画面への統合

**ユーザーストーリー:** ユーザーとして、対局詳細画面で AI 解説と AI 生成候補を一つの画面で確認したい。対局の全体像を把握できるようにするためである。

#### 受入基準

1. THE Game_Detail_Screen SHALL Commentary_Section を盤面セクションの下に表示する
2. THE Game_Detail_Screen SHALL ページ読み込み時に解説データを取得する
3. THE Game_Detail_Screen SHALL 解説データの取得を候補データの取得と並行して行う
4. THE Game_Detail_Screen SHALL 解説データの取得失敗が候補一覧の表示をブロックしない
5. WHEN 対局のステータスが "FINISHED" の時, THE Commentary_Section SHALL 最終ターンの解説を表示する

### 要件 8: 解説取得 API エンドポイント（バックエンド）

**ユーザーストーリー:** 開発者として、解説取得 API エンドポイントを実装したい。フロントエンドから解説データを取得できるようにするためである。

#### 受入基準

1. THE API SHALL GET /games/:gameId/commentary エンドポイントを提供する
2. THE API SHALL 指定された gameId の全解説を turnNumber の昇順で返す
3. THE API SHALL レスポンスに commentaries 配列を含める
4. THE API SHALL 各解説に turnNumber、content、generatedBy、createdAt を含める
5. WHEN gameId に対応する対局が存在しない時, THE API SHALL 404 エラーを返す
6. WHEN 解説が存在しない時, THE API SHALL 空の commentaries 配列を返す
7. THE API SHALL 認証不要（公開エンドポイント）とする

### 要件 9: アクセシビリティ

**ユーザーストーリー:** 障害を持つユーザーとして、AI コンテンツにアクセシブルにアクセスしたい。支援技術を使って AI 解説と候補情報を利用できるようにするためである。

#### 受入基準

1. THE AI_Candidate_Badge SHALL セマンティック HTML を使用する
2. THE Commentary_Section SHALL 適切な見出し階層（h2）を使用する
3. THE Commentary_Section SHALL セマンティック HTML（section、article）を使用する
4. THE ターン選択ボタン SHALL キーボードでアクセス可能である
5. THE ターン選択ボタン SHALL フォーカスインジケーターを表示する
6. THE ターン選択ボタン SHALL 無効化時に aria-disabled 属性を設定する
7. THE Commentary_Section SHALL スクリーンリーダーに適切に読み上げられる
8. THE エラーメッセージ SHALL role="alert" を設定する

### 要件 10: テスト可能性

**ユーザーストーリー:** 開発者として、AI コンテンツ表示のテストを実装したい。コード品質を保証するためである。

#### 受入基準

1. THE AI_Candidate_Badge SHALL Vitest と React Testing Library でユニットテストされる
2. THE Commentary_Section SHALL Vitest と React Testing Library でユニットテストされる
3. THE Commentary_API_Client SHALL Vitest でユニットテストされる
4. THE テスト SHALL API レスポンスをモック化する
5. THE テスト SHALL エラーハンドリングのケースをカバーする
6. THE テスト SHALL アクセシビリティのケースをカバーする
7. THE テスト SHALL ターン切り替えのインタラクションをカバーする
8. THE テスト SHALL 最低 80% のコードカバレッジを達成する

### 要件 11: 型安全性

**ユーザーストーリー:** 開発者として、型安全な実装を行いたい。ランタイムエラーを防ぐためである。

#### 受入基準

1. ALL コンポーネント SHALL TypeScript strict mode を使用する
2. THE Commentary 型 SHALL turnNumber（number）、content（string）、generatedBy（string）、createdAt（string）を含む
3. THE Commentary_Section SHALL props を TypeScript インターフェースで定義する
4. ALL コンポーネント SHALL `any` 型を使用しない
5. ALL イベントハンドラー SHALL 適切な型アノテーションを持つ
