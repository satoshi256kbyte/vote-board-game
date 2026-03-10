# Requirements Document

## Introduction

盤面上での手の選択UI機能は、投票対局アプリケーションのフロントエンド機能で、ユーザーが対局詳細画面で盤面上のマスを直接クリックして次の一手を選択・投稿できるようにします。この機能により、既存の候補投稿フォーム（spec 24）のユーザビリティが向上し、より直感的な操作が可能になります。既存のBoard_Component（spec 15）を拡張し、インタラクティブな盤面操作を実現します。

## Glossary

- **Interactive_Board**: クリック可能なセルを持つインタラクティブな盤面コンポーネント
- **Cell_Selector**: 盤面上のセルを選択する機能
- **Valid_Move_Indicator**: 合法手を視覚的に示すインジケーター
- **Selected_Cell_Highlight**: 選択されたセルのハイライト表示
- **Move_Preview**: 選択した手を適用した盤面のプレビュー
- **Board_Component**: 既存のオセロ盤面表示コンポーネント（spec 15）
- **Candidate_Form**: 候補投稿フォームコンポーネント（spec 24）
- **Game_Logic**: オセロのゲームロジック（spec 13）

## Requirements

### Requirement 1: インタラクティブ盤面の表示

**User Story:** As a ユーザー, I want 盤面上のマスをクリックできる, so that 直感的に次の一手を選択できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL 対局詳細画面の候補投稿セクションに表示される
2. THE Interactive_Board SHALL 既存のBoard_Componentを拡張して実装される
3. THE Interactive_Board SHALL 8x8のオセロ盤面を表示する
4. THE Interactive_Board SHALL 現在の盤面状態を反映する
5. THE Interactive_Board SHALL 各セルをクリック可能にする
6. THE Interactive_Board SHALL デスクトップでは40pxのセルサイズを使用する
7. THE Interactive_Board SHALL モバイルでは30pxのセルサイズを使用する
8. THE Interactive_Board SHALL 盤面の座標（A-H, 1-8）を表示する

### Requirement 2: 合法手の表示

**User Story:** As a ユーザー, I want 置ける場所が分かる, so that 無効な手を選択しなくて済む

#### Acceptance Criteria

1. THE Interactive_Board SHALL 現在のプレイヤーの合法手を計算する
2. THE Interactive_Board SHALL Game_Logicを使用して合法手を判定する
3. THE Interactive_Board SHALL 合法手のセルにValid_Move_Indicatorを表示する
4. THE Valid_Move_Indicator SHALL 薄い緑色の円として表示される
5. THE Valid_Move_Indicator SHALL ホバー時に濃い緑色に変化する
6. THE Valid_Move_Indicator SHALL 合法手のセルのみに表示される
7. WHEN 合法手が存在しない時, THE Interactive_Board SHALL "置ける場所がありません" メッセージを表示する

### Requirement 3: セル選択機能

**User Story:** As a ユーザー, I want セルをクリックして選択したい, so that 次の一手を指定できる

#### Acceptance Criteria

1. WHEN ユーザーが合法手のセルをクリックした時, THE Cell_Selector SHALL そのセルを選択状態にする
2. WHEN ユーザーが非合法手のセルをクリックした時, THE Cell_Selector SHALL 何もしない
3. WHEN ユーザーが既に選択されたセルをクリックした時, THE Cell_Selector SHALL 選択を解除する
4. THE Cell_Selector SHALL 選択されたセルの座標を "row,col" 形式で保存する
5. THE Cell_Selector SHALL 選択されたセルの座標をCandidate_Formに渡す
6. THE Cell_Selector SHALL 一度に1つのセルのみ選択可能にする
7. WHEN 新しいセルが選択された時, THE Cell_Selector SHALL 前の選択を解除する

### Requirement 4: 選択セルのハイライト

**User Story:** As a ユーザー, I want 選択したセルが分かる, so that 自分の選択を確認できる

#### Acceptance Criteria

1. THE Selected_Cell_Highlight SHALL 選択されたセルに表示される
2. THE Selected_Cell_Highlight SHALL 青色の枠線として表示される
3. THE Selected_Cell_Highlight SHALL 3pxの太さを持つ
4. THE Selected_Cell_Highlight SHALL セルの内側に表示される
5. THE Selected_Cell_Highlight SHALL アニメーション効果を持つ（フェードイン）
6. WHEN セルの選択が解除された時, THE Selected_Cell_Highlight SHALL 非表示になる

### Requirement 5: 手のプレビュー表示

**User Story:** As a ユーザー, I want 選択した手の結果を見たい, so that 手の効果を確認できる

#### Acceptance Criteria

1. WHEN セルが選択された時, THE Move_Preview SHALL 選択した手を適用した盤面を表示する
2. THE Move_Preview SHALL 既存のBoardPreview_Component（spec 23）を使用する
3. THE Move_Preview SHALL 裏返される石を視覚的に示す
4. THE Move_Preview SHALL 選択されたセルをハイライト表示する
5. THE Move_Preview SHALL 黒石と白石の数を表示する
6. THE Move_Preview SHALL Interactive_Boardの下に配置される
7. WHEN セルが選択されていない時, THE Move_Preview SHALL 非表示になる

### Requirement 6: 候補投稿フォームとの統合

**User Story:** As a ユーザー, I want 盤面で選択した手を投稿したい, so that 候補として登録できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL Candidate_Formコンポーネント内に統合される
2. THE Interactive_Board SHALL 選択された座標をCandidate_Formに渡す
3. THE Candidate_Form SHALL Interactive_Boardからの座標を受け取る
4. THE Candidate_Form SHALL 座標が選択されていない場合、"位置を選択してください" エラーを表示する
5. THE Candidate_Form SHALL 説明文入力フィールドを表示する
6. THE Candidate_Form SHALL 投稿ボタンを表示する
7. WHEN 投稿ボタンがクリックされた時, THE Candidate_Form SHALL 選択された座標と説明文をAPIに送信する

### Requirement 7: タッチデバイス対応

**User Story:** As a モバイルユーザー, I want タッチで盤面を操作したい, so that スマートフォンでも使いやすい

#### Acceptance Criteria

1. THE Interactive_Board SHALL タッチイベントをサポートする
2. THE Interactive_Board SHALL 最小44pxのタッチターゲットサイズを持つ
3. THE Interactive_Board SHALL タップ時に視覚的フィードバックを提供する
4. THE Interactive_Board SHALL ダブルタップによるズームを防止する
5. THE Interactive_Board SHALL スワイプジェスチャーを無効化する
6. THE Valid_Move_Indicator SHALL タッチデバイスでも視認可能なサイズである

### Requirement 8: キーボード操作

**User Story:** As a キーボードユーザー, I want キーボードで盤面を操作したい, so that マウスなしでも使える

#### Acceptance Criteria

1. THE Interactive_Board SHALL キーボードでフォーカス可能である
2. THE Interactive_Board SHALL 矢印キーでセル間を移動できる
3. THE Interactive_Board SHALL Enterキーまたはスペースキーでセルを選択できる
4. THE Interactive_Board SHALL フォーカスされたセルに視覚的インジケーターを表示する
5. THE Interactive_Board SHALL Tabキーで盤面全体をスキップできる
6. THE Interactive_Board SHALL 適切なARIA属性を持つ

### Requirement 9: エラーハンドリング

**User Story:** As a ユーザー, I want エラーが分かりやすい, so that 問題を理解できる

#### Acceptance Criteria

1. WHEN 非合法手が選択された時, THE Interactive_Board SHALL "この位置には石を置けません" メッセージを表示する
2. WHEN 盤面状態の取得に失敗した時, THE Interactive_Board SHALL "盤面の読み込みに失敗しました" メッセージを表示する
3. WHEN 合法手の計算に失敗した時, THE Interactive_Board SHALL エラーをコンソールにログ出力する
4. THE エラーメッセージ SHALL 3秒後に自動的に消える
5. THE エラーメッセージ SHALL 赤色の背景で表示される
6. THE エラーメッセージ SHALL スクリーンリーダーにアナウンスされる

### Requirement 10: パフォーマンス

**User Story:** As a ユーザー, I want 盤面操作が高速である, so that ストレスなく使える

#### Acceptance Criteria

1. THE Interactive_Board SHALL セルクリックに100ms以内で応答する
2. THE Interactive_Board SHALL 合法手の計算を50ms以内に完了する
3. THE Interactive_Board SHALL 不要な再レンダリングを防ぐためにReact.memoを使用する
4. THE Interactive_Board SHALL 合法手の計算結果をメモ化する
5. THE Move_Preview SHALL プレビュー計算を200ms以内に完了する
6. THE Interactive_Board SHALL 60fpsのアニメーションフレームレートを維持する

### Requirement 11: アクセシビリティ

**User Story:** As a 障害を持つユーザー, I want アクセシブルな盤面を使いたい, so that 支援技術で操作できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL role="grid" 属性を持つ
2. THE Interactive_Board SHALL aria-label="オセロの盤面" を持つ
3. THE セル SHALL role="gridcell" 属性を持つ
4. THE セル SHALL aria-label で座標を示す（例: "A1"）
5. THE 合法手のセル SHALL aria-label に "選択可能" を含む
6. THE 選択されたセル SHALL aria-selected="true" を持つ
7. THE Interactive_Board SHALL 最小4.5:1のコントラスト比を持つ
8. THE エラーメッセージ SHALL role="alert" 属性を持つ

### Requirement 12: 視覚的フィードバック

**User Story:** As a ユーザー, I want 操作の結果が分かる, so that 正しく操作できているか確認できる

#### Acceptance Criteria

1. WHEN セルにホバーした時, THE Interactive_Board SHALL セルの背景色を変更する
2. WHEN 合法手のセルにホバーした時, THE Valid_Move_Indicator SHALL 濃い緑色に変化する
3. WHEN セルがクリックされた時, THE Interactive_Board SHALL クリックアニメーションを表示する
4. WHEN セルが選択された時, THE Interactive_Board SHALL 選択アニメーションを表示する
5. THE アニメーション SHALL 0.2秒の持続時間を持つ
6. THE アニメーション SHALL prefers-reduced-motionを尊重する

### Requirement 13: レスポンシブデザイン

**User Story:** As a ユーザー, I want モバイルとデスクトップで使いやすい, so that どのデバイスでも操作できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL デスクトップでは40pxのセルサイズを使用する（min-width: 768px）
2. THE Interactive_Board SHALL モバイルでは30pxのセルサイズを使用する（max-width: 767px）
3. THE Interactive_Board SHALL 画面幅に収まるサイズである
4. THE Valid_Move_Indicator SHALL デバイスに応じてサイズを調整する
5. THE Move_Preview SHALL モバイルで縦スクロール可能である
6. THE エラーメッセージ SHALL モバイルで読みやすいサイズである

### Requirement 14: 型安全性

**User Story:** As a 開発者, I want 型安全なコンポーネントを実装したい, so that ランタイムエラーを防げる

#### Acceptance Criteria

1. THE Interactive_Board SHALL TypeScript strict modeを使用する
2. THE Interactive_Board SHALL TypeScriptインターフェースでpropsを定義する
3. THE セル座標 SHALL [row: number, col: number] 型を使用する
4. THE 合法手リスト SHALL Array<[number, number]> 型を使用する
5. THE イベントハンドラー SHALL 適切な型アノテーションを持つ
6. THE Interactive_Board SHALL `any`型を使用しない
7. THE Interactive_Board SHALL 必要に応じてZodでランタイム検証を行う

### Requirement 15: テスト可能性

**User Story:** As a 開発者, I want テスト可能なコンポーネントを実装したい, so that コード品質を保証できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL Vitestでユニットテストされる
2. THE Interactive_Board SHALL React Testing Libraryでテストされる
3. THE セル選択機能 SHALL ユーザーインタラクションテストを持つ
4. THE 合法手計算 SHALL ロジックテストを持つ
5. THE エラーハンドリング SHALL エラーケーステストを持つ
6. THE Interactive_Board SHALL アクセシビリティテストを持つ
7. THE テスト SHALL 最低80%のコードカバレッジを達成する
8. THE 合法手計算 SHALL プロパティベーステストを使用する

### Requirement 16: 既存コンポーネントとの互換性

**User Story:** As a 開発者, I want 既存のコンポーネントと統合したい, so that 一貫性のあるUIを提供できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL 既存のBoard_Componentのpropsと互換性を持つ
2. THE Interactive_Board SHALL 既存のスタイリング（Tailwind CSS）を使用する
3. THE Interactive_Board SHALL 既存のGame_Logicを使用する
4. THE Interactive_Board SHALL 既存のBoardPreview_Componentと連携する
5. THE Interactive_Board SHALL 既存のCandidate_Formに統合される
6. THE Interactive_Board SHALL 既存のエラーハンドリングパターンに従う

### Requirement 17: 状態管理

**User Story:** As a 開発者, I want 適切な状態管理を実装したい, so that コンポーネントの動作が予測可能である

#### Acceptance Criteria

1. THE Interactive_Board SHALL useStateで選択されたセルを管理する
2. THE Interactive_Board SHALL useMemoで合法手リストをメモ化する
3. THE Interactive_Board SHALL useCallbackでイベントハンドラーをメモ化する
4. THE Interactive_Board SHALL 親コンポーネントに選択状態を通知する
5. THE Interactive_Board SHALL 制御されたコンポーネントとして動作する
6. THE Interactive_Board SHALL propsの変更に適切に反応する

### Requirement 18: ユーザビリティ

**User Story:** As a ユーザー, I want 使いやすい盤面を操作したい, so that 快適に候補を投稿できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL 合法手が一目で分かるデザインである
2. THE Interactive_Board SHALL 選択されたセルが明確に分かる
3. THE Interactive_Board SHALL ホバー時の視覚的フィードバックが即座に表示される
4. THE Interactive_Board SHALL エラーメッセージが分かりやすい
5. THE Interactive_Board SHALL 操作方法のヒントを表示する（オプション）
6. THE Interactive_Board SHALL ローディング中は操作を無効化する

### Requirement 19: 候補一覧画面への統合

**User Story:** As a ユーザー, I want 候補一覧画面から盤面で手を選択したい, so that 簡単に候補を投稿できる

#### Acceptance Criteria

1. THE Interactive_Board SHALL 候補一覧画面の "候補を投稿" セクションに表示される
2. THE Interactive_Board SHALL 対局詳細画面（/games/[gameId]）に統合される
3. THE Interactive_Board SHALL 候補投稿フォーム（/games/[gameId]/candidates/new）に統合される
4. WHEN ユーザーが未認証の時, THE Interactive_Board SHALL 無効化される
5. WHEN ユーザーが未認証の時, THE Interactive_Board SHALL "ログインして投稿" メッセージを表示する
6. THE Interactive_Board SHALL 既存の候補投稿ボタンと統合される

### Requirement 20: パーサーとシリアライザー

**User Story:** As a 開発者, I want 座標の変換が正確である, so that データの整合性を保証できる

#### Acceptance Criteria

1. THE Coordinate_Parser SHALL "row,col" 形式の文字列を [row, col] 配列に変換する
2. THE Coordinate_Parser SHALL 無効な形式に対してエラーを返す
3. THE Coordinate_Serializer SHALL [row, col] 配列を "row,col" 形式の文字列に変換する
4. THE Coordinate_Serializer SHALL 範囲外の値に対してエラーを返す
5. FOR ALL 有効な座標, パース→シリアライズ→パース SHALL 元の値を返す（round-trip property）
6. THE Coordinate_Parser SHALL Zodスキーマでバリデーションを行う
7. THE 座標変換 SHALL プロパティベーステストでテストされる
