# Requirements Document

## Introduction

次の一手候補一覧表示機能は、投票対局アプリケーションのフロントエンド機能で、ユーザーが対局詳細画面で次の一手候補を閲覧し、投票できるようにします。この機能は既存のバックエンドAPI（18-get-move-candidates-api、19-post-move-candidate-api、20-vote-api、21-vote-change-api、22-vote-status-api）と連携し、Next.js 16のApp RouterとReact 19を使用して実装されます。また、既存のE2Eテスト（16-e2e-testing-game-management）のメンテナンスも含まれます。

## Glossary

- **Candidate_List_Component**: 次の一手候補一覧を表示するコンポーネント
- **Candidate_Card_Component**: 個別の候補を表示するカードコンポーネント
- **Vote_Button**: 投票ボタンコンポーネント
- **Vote_Status_Indicator**: 投票状況を表示するインジケーター
- **Board_Preview**: 候補の手を適用した盤面プレビュー
- **API_Client**: バックエンドAPIと通信するクライアント
- **Server_Component**: サーバー側でレンダリングされるReactコンポーネント
- **Client_Component**: クライアント側でレンダリングされるReactコンポーネント
- **E2E_Test**: End-to-Endテスト - Playwrightを使用した統合テスト

## Requirements

### Requirement 1: 候補一覧の表示

**User Story:** As a ユーザー, I want 次の一手候補の一覧を見たい, so that どの候補に投票するか検討できる

#### Acceptance Criteria

1. THE Candidate_List_Component SHALL 対局詳細画面に表示される
2. THE Candidate_List_Component SHALL GET /games/:gameId/turns/:turnNumber/candidates APIから候補を取得する
3. THE Candidate_List_Component SHALL 候補を投票数の降順で表示する
4. THE Candidate_List_Component SHALL 各候補をCandidate_Card_Componentとして表示する
5. WHEN 候補が存在しない時, THE Candidate_List_Component SHALL "まだ候補がありません" メッセージを表示する
6. THE Candidate_List_Component SHALL ローディング中はスケルトンローダーを表示する
7. THE Candidate_List_Component SHALL デスクトップではグリッドレイアウトを使用する
8. THE Candidate_List_Component SHALL モバイルでは単一カラムレイアウトを使用する

### Requirement 2: 候補カードの表示

**User Story:** As a ユーザー, I want 各候補の詳細情報を見たい, so that 候補の内容を理解できる

#### Acceptance Criteria

1. THE Candidate_Card_Component SHALL 候補の手の位置（例: "D3"）を表示する
2. THE Candidate_Card_Component SHALL Board_Previewを表示する
3. THE Candidate_Card_Component SHALL 候補の説明文（最大200文字）を表示する
4. THE Candidate_Card_Component SHALL 投稿者のユーザー名を表示する
5. THE Candidate_Card_Component SHALL 投票数を表示する
6. THE Candidate_Card_Component SHALL 投票締切日時を表示する
7. THE Candidate_Card_Component SHALL 候補のステータス（active/closed）を表示する
8. THE Candidate_Card_Component SHALL Vote_Buttonを表示する
9. THE Candidate_Card_Component SHALL 作成日時を表示する
10. THE Candidate_Card_Component SHALL Tailwind CSSでスタイリングする

### Requirement 3: 盤面プレビューの表示

**User Story:** As a ユーザー, I want 候補の手を適用した盤面を見たい, so that 手の効果を視覚的に理解できる

#### Acceptance Criteria

1. THE Board_Preview SHALL 8x8のオセロ盤面を表示する
2. THE Board_Preview SHALL 候補の手を適用した状態の盤面を表示する
3. THE Board_Preview SHALL 候補の手の位置をハイライト表示する
4. THE Board_Preview SHALL 裏返される石をアニメーション表示する（オプション）
5. THE Board_Preview SHALL デスクトップでは30pxのセルサイズを使用する
6. THE Board_Preview SHALL モバイルでは24pxのセルサイズを使用する
7. THE Board_Preview SHALL 黒石と白石の数を表示する
8. THE Board_Preview SHALL 既存のBoard_Componentを再利用する

### Requirement 4: 投票機能

**User Story:** As a 認証済みユーザー, I want 候補に投票したい, so that 自分の意見を反映できる

#### Acceptance Criteria

1. THE Vote_Button SHALL "投票する" ラベルを表示する
2. WHEN ユーザーが未認証の時, THE Vote_Button SHALL 無効化される
3. WHEN ユーザーが未認証の時, THE Vote_Button SHALL "ログインして投票" ツールチップを表示する
4. WHEN Vote_Buttonがクリックされた時, THE Candidate_Card_Component SHALL POST /votes APIを呼び出す
5. WHEN 投票が成功した時, THE Candidate_Card_Component SHALL 投票数を更新する
6. WHEN 投票が成功した時, THE Candidate_Card_Component SHALL Vote_Status_Indicatorを表示する
7. WHEN 投票が失敗した時, THE Candidate_Card_Component SHALL エラーメッセージを表示する
8. THE Vote_Button SHALL 投票中はローディングインジケーターを表示する
9. THE Vote_Button SHALL 投票中は無効化される

### Requirement 5: 投票状況の表示

**User Story:** As a ユーザー, I want 自分の投票状況を見たい, so that どの候補に投票したか確認できる

#### Acceptance Criteria

1. THE Vote_Status_Indicator SHALL "✓投票済み" ラベルを表示する
2. THE Vote_Status_Indicator SHALL 緑色の背景色を使用する
3. WHEN ユーザーが候補に投票済みの時, THE Candidate_Card_Component SHALL Vote_Status_Indicatorを表示する
4. WHEN ユーザーが候補に投票済みの時, THE Candidate_Card_Component SHALL Vote_Buttonを非表示にする
5. THE Candidate_List_Component SHALL GET /votes/status APIから投票状況を取得する
6. THE Candidate_List_Component SHALL 投票状況を各Candidate_Card_Componentに渡す

### Requirement 6: 投票変更機能

**User Story:** As a 認証済みユーザー, I want 投票を変更したい, so that 考えが変わった時に別の候補に投票できる

#### Acceptance Criteria

1. WHEN ユーザーが既に別の候補に投票済みの時, THE Vote_Button SHALL "投票を変更" ラベルを表示する
2. WHEN "投票を変更" ボタンがクリックされた時, THE Candidate_Card_Component SHALL 確認ダイアログを表示する
3. THE 確認ダイアログ SHALL "現在の投票を取り消して、この候補に投票しますか？" メッセージを表示する
4. WHEN ユーザーが確認した時, THE Candidate_Card_Component SHALL PUT /votes APIを呼び出す
5. WHEN 投票変更が成功した時, THE Candidate_List_Component SHALL 全ての候補の投票状況を更新する
6. WHEN 投票変更が失敗した時, THE Candidate_Card_Component SHALL エラーメッセージを表示する

### Requirement 7: リアルタイム更新

**User Story:** As a ユーザー, I want 投票数がリアルタイムで更新されるのを見たい, so that 最新の投票状況を把握できる

#### Acceptance Criteria

1. THE Candidate_List_Component SHALL 30秒ごとに候補一覧を再取得する
2. THE Candidate_List_Component SHALL 投票数の変更をアニメーション表示する（オプション）
3. WHEN ユーザーが投票した時, THE Candidate_List_Component SHALL 即座に候補一覧を再取得する
4. THE Candidate_List_Component SHALL ポーリング中はローディングインジケーターを表示しない
5. THE Candidate_List_Component SHALL ページがバックグラウンドの時はポーリングを停止する\_List_Component SHALL ページがバックグラウンドの時はポーリングを停止する

### Requirement 8: エラーハンドリング

**User Story:** As a ユーザー, I want エラーが発生した時に明確なメッセージを見たい, so that 何が問題か理解できる

#### Acceptance Criteria

1. WHEN 候補取得APIが失敗した時, THE Candidate_List_Component SHALL "候補の取得に失敗しました" エラーメッセージを表示する
2. WHEN 投票APIが失敗した時, THE Candidate_Card_Component SHALL "投票に失敗しました" エラーメッセージを表示する
3. WHEN ネットワークエラーが発生した時, THE Candidate_List_Component SHALL "ネットワークエラーが発生しました" メッセージを表示する
4. WHEN 401エラーが発生した時, THE Candidate_List_Component SHALL ログイン画面にリダイレクトする
5. WHEN 404エラーが発生した時, THE Candidate_List_Component SHALL "対局が見つかりません" メッセージを表示する
6. THE Candidate_List_Component SHALL エラーをコンソールにログ出力する
7. THE Candidate_List_Component SHALL エラーメッセージに機密情報を含めない

### Requirement 9: レスポンシブデザイン

**User Story:** As a ユーザー, I want モバイルとデスクトップで快適に使いたい, so that どのデバイスでも候補を閲覧できる

#### Acceptance Criteria

1. THE Candidate_List_Component SHALL デスクトップでは2カラムのグリッドレイアウトを使用する（min-width: 768px）
2. THE Candidate_List_Component SHALL タブレットでは2カラムのグリッドレイアウトを使用する（min-width: 640px）
3. THE Candidate_List_Component SHALL モバイルでは単一カラムレイアウトを使用する（max-width: 639px）
4. THE Candidate_Card_Component SHALL モバイルで縦スクロール可能である
5. THE Vote_Button SHALL モバイルで最小44pxのタッチターゲットサイズを持つ
6. THE Board_Preview SHALL モバイルで画面幅に収まるサイズである

### Requirement 10: アクセシビリティ

**User Story:** As a 障害を持つユーザー, I want アクセシブルな候補一覧を使いたい, so that 支援技術で候補を閲覧できる

#### Acceptance Criteria

1. THE Candidate_Card_Component SHALL セマンティックHTMLを使用する
2. THE Vote_Button SHALL キーボードでアクセス可能である
3. THE Vote_Button SHALL フォーカスインジケーターを表示する
4. THE Candidate_Card_Component SHALL ARIAラベルを適切に設定する
5. THE Vote_Status_Indicator SHALL スクリーンリーダーに読み上げられる
6. THE エラーメッセージ SHALL スクリーンリーダーにアナウンスされる
7. THE Candidate_List_Component SHALL 最小4.5:1のコントラスト比を持つ
8. THE Candidate_Card_Component SHALL 適切な見出し階層を持つ

### Requirement 11: パフォーマンス

**User Story:** As a ユーザー, I want 候補一覧が高速に表示されるのを見たい, so that ストレスなく閲覧できる

#### Acceptance Criteria

1. THE Candidate_List_Component SHALL 初回レンダリングを1秒以内に完了する
2. THE Candidate_List_Component SHALL Server_Componentで初期データを取得する
3. THE Candidate_Card_Component SHALL 画像の遅延読み込みを使用する
4. THE Board_Preview SHALL Canvas APIまたはSVGで効率的にレンダリングする
5. THE Candidate_List_Component SHALL 仮想スクロールを使用する（候補が50個以上の場合）
6. THE Candidate_List_Component SHALL 不要な再レンダリングを防ぐためにReact.memoを使用する

### Requirement 12: 型安全性

**User Story:** As a 開発者, I want 型安全なコンポーネントを実装したい, so that ランタイムエラーを防げる

#### Acceptance Criteria

1. ALL コンポーネント SHALL TypeScript strict modeを使用する
2. ALL コンポーネント SHALL TypeScriptインターフェースでpropsを定義する
3. ALL APIレスポンス SHALL packages/api/src/types/candidate.tsの型を使用する
4. ALL コンポーネント SHALL 必要に応じてランタイムでpropsを検証する
5. ALL イベントハンドラー SHALL 適切な型アノテーションを持つ
6. THE コンポーネント SHALL `any`型を使用しない
7. THE コンポーネント SHALL 必要に応じてZodでランタイム検証を行う

### Requirement 13: テスト可能性

**User Story:** As a 開発者, I want テスト可能なコンポーネントを実装したい, so that コード品質を保証できる

#### Acceptance Criteria

1. ALL コンポーネント SHALL Vitestでユニットテストされる
2. ALL コンポーネント SHALL React Testing Libraryでテストされる
3. ALL インタラクティブコンポーネント SHALL ユーザーインタラクションテストを持つ
4. THE 投票機能 SHALL 投票フローのテストを持つ
5. ALL API呼び出し SHALL テストでモック化される
6. ALL コンポーネント SHALL アクセシビリティテストを持つ
7. THE テスト SHALL 最低80%のコードカバレッジを達成する
8. THE 複雑なロジック SHALL 必要に応じてプロパティベーステストを使用する

### Requirement 14: E2Eテストのメンテナンス

**User Story:** As a 開発者, I want 既存のE2Eテストを更新したい, so that 新機能がE2Eテストでカバーされる

#### Acceptance Criteria

1. THE E2E_Test SHALL 候補一覧表示のテストケースを含む
2. THE E2E_Test SHALL 投票フローのテストケースを含む
3. THE E2E_Test SHALL 投票変更フローのテストケースを含む
4. THE E2E_Test SHALL 未認証ユーザーの候補閲覧テストケースを含む
5. THE E2E_Test SHALL エラーハンドリングのテストケースを含む
6. THE E2E_Test SHALL モバイルビューポートでのテストケースを含む
7. THE E2E_Test SHALL 既存の対局管理E2Eテスト（16-e2e-testing-game-management）を更新する
8. THE E2E_Test SHALL GitHub Actionsで自動実行される

### Requirement 15: 候補投稿ボタンの統合

**User Story:** As a ユーザー, I want 候補一覧から候補を投稿したい, so that 簡単に新しい候補を追加できる

#### Acceptance Criteria

1. THE Candidate_List_Component SHALL "候補を投稿" ボタンを表示する
2. THE "候補を投稿" ボタン SHALL 候補一覧の上部に配置される
3. WHEN ユーザーが未認証の時, THE "候補を投稿" ボタン SHALL 無効化される
4. WHEN ユーザーが未認証の時, THE "候補を投稿" ボタン SHALL "ログインして投稿" ツールチップを表示する
5. WHEN "候補を投稿" ボタンがクリックされた時, THE Candidate_List_Component SHALL `/games/[gameId]/candidates/new` に遷移する
6. THE "候補を投稿" ボタン SHALL 既存の対局詳細画面の候補投稿ボタンと統合される

### Requirement 16: ソート・フィルター機能

**User Story:** As a ユーザー, I want 候補をソート・フィルターしたい, so that 目的の候補を見つけやすくなる

#### Acceptance Criteria

1. THE Candidate_List_Component SHALL デフォルトで投票数の降順でソートする
2. THE Candidate_List_Component SHALL ソートオプション（投票数、作成日時）を提供する
3. THE Candidate_List_Component SHALL ソート順（昇順、降順）を切り替えられる
4. THE Candidate_List_Component SHALL フィルターオプション（自分の投票、AI生成、ユーザー投稿）を提供する
5. WHEN ソートが変更された時, THE Candidate_List_Component SHALL 候補を再ソートする
6. WHEN フィルターが変更された時, THE Candidate_List_Component SHALL 候補を再フィルターする
7. THE ソート・フィルター設定 SHALL URLクエリパラメータに保存される

### Requirement 17: 候補の詳細表示

**User Story:** As a ユーザー, I want 候補の詳細を見たい, so that より詳しい情報を確認できる

#### Acceptance Criteria

1. THE Candidate_Card_Component SHALL "詳細を見る" リンクを表示する
2. WHEN "詳細を見る" リンクがクリックされた時, THE Candidate_Card_Component SHALL `/games/[gameId]/candidates/[candidateId]` に遷移する
3. THE 候補詳細画面 SHALL 既存のCandidate_Detail_Screen（spec 15）を使用する
4. THE 候補詳細画面 SHALL 候補の完全な説明文を表示する
5. THE 候補詳細画面 SHALL 候補の投票履歴を表示する（オプション）
6. THE 候補詳細画面 SHALL シェアボタンを表示する

### Requirement 18: 締切表示

**User Story:** As a ユーザー, I want 投票締切までの残り時間を見たい, so that 投票のタイミングを把握できる

#### Acceptance Criteria

1. THE Candidate_Card_Component SHALL 投票締切までの残り時間を表示する
2. THE 残り時間表示 SHALL "あと2時間30分" のような相対時間形式を使用する
3. WHEN 締切まで1時間未満の時, THE 残り時間表示 SHALL 赤色で表示する
4. WHEN 締切まで24時間未満の時, THE 残り時間表示 SHALL オレンジ色で表示する
5. WHEN 締切を過ぎた時, THE Candidate_Card_Component SHALL "締切済み" を表示する
6. THE 残り時間表示 SHALL 1分ごとに更新される

### Requirement 19: 投票数のアニメーション

**User Story:** As a ユーザー, I want 投票数の変化をアニメーションで見たい, so that 投票の反映を視覚的に確認できる

#### Acceptance Criteria

1. WHEN 投票数が増加した時, THE Candidate_Card_Component SHALL 投票数をアニメーション表示する
2. THE アニメーション SHALL フェードイン効果を使用する
3. THE アニメーション SHALL 0.3秒の持続時間を持つ
4. THE アニメーション SHALL ユーザーの投票時に即座に実行される
5. THE アニメーション SHALL ポーリング更新時にも実行される
6. THE アニメーション SHALL アクセシビリティ設定（prefers-reduced-motion）を尊重する

### Requirement 20: 候補のステータス表示

**User Story:** As a ユーザー, I want 候補のステータスを見たい, so that 投票可能かどうか判断できる

#### Acceptance Criteria

1. THE Candidate_Card_Component SHALL 候補のステータスバッジを表示する
2. WHEN ステータスが "active" の時, THE ステータスバッジ SHALL "投票受付中" を緑色で表示する
3. WHEN ステータスが "closed" の時, THE ステータスバッジ SHALL "締切済み" をグレー色で表示する
4. WHEN ステータスが "closed" の時, THE Vote_Button SHALL 無効化される
5. THE ステータスバッジ SHALL 候補カードの右上に配置される
