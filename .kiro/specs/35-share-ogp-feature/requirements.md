# 要件定義書

## はじめに

シェア・OGP 機能は、投票対局の各画面（対局詳細、特定ターン、候補詳細）を SNS でシェアする際に、盤面のサムネイル画像を含む OGP（Open Graph Protocol）メタデータを提供する機能である。

本プロダクトでは議論機能を持たず、SNS 上での議論を促進する設計方針を採用している。そのため、シェア時のサムネイルに盤面が表示されることが重要であり、ユーザーが盤面の状態を軸に SNS 上で議論できるようにする。

現在の実装状況:

- OGP 画像生成 API ルート（`/api/og/game/[gameId]`、`/api/og/candidate/[candidateId]`）は存在するが、盤面はプレースホルダー表示のみ
- `board-svg.tsx` に SVG 生成ロジックが存在するが、OGP 画像生成 API では未使用
- `ShareButton` コンポーネントは実装済みだが、SNS 別シェア（X/Twitter、LINE）に未対応
- 候補詳細画面には `generateMetadata` が実装済みだが、対局詳細画面は Client Component のためメタデータ生成が未実装
- 特定ターンの盤面表示画面（`/games/[gameId]/turns/[turnNumber]`）は未作成

本 Spec では、OGP 画像に実際の盤面を描画し、SNS 別シェアボタンを追加し、全対象画面にメタタグを設定する。

## 用語集

- **OGP_Image_Generator**: Next.js の API Route（Edge Runtime）で `@vercel/og` を使用して OGP 画像を動的生成するエンドポイント
- **Board_SVG_Renderer**: オセロの盤面状態（8x8 配列）を SVG 形式で描画するモジュール（`packages/web/src/lib/ogp/board-svg.tsx`）
- **Share_Button**: SNS シェア機能を提供する Client Component（Web Share API + フォールバック）
- **Metadata_Generator**: Next.js App Router の `generateMetadata` 関数を使用して OGP/Twitter Card メタタグを生成する仕組み
- **BoardState**: 8x8 の数値配列（0=空、1=黒、2=白）で表現されるオセロの盤面状態
- **API_Client**: バックエンド API（Hono on Lambda）からゲーム・候補データを取得するフロントエンドのクライアントモジュール
- **Game_Detail_Page**: 対局詳細画面（`/games/[gameId]`）
- **Turn_Detail_Page**: 特定ターンの盤面表示画面（`/games/[gameId]/turns/[turnNumber]`）
- **Candidate_Detail_Page**: 候補詳細画面（`/games/[gameId]/candidates/[candidateId]`）

## 要件

### 要件 1: OGP 画像への実際の盤面描画

**ユーザーストーリー:** SNS でシェアされたリンクを見るユーザーとして、サムネイル画像に実際の盤面状態が表示されることで、対局の状況を一目で把握したい。

#### 受け入れ基準

1. WHEN OGP_Image_Generator がゲーム詳細の OGP 画像リクエストを受信した時、THE OGP_Image_Generator SHALL API_Client を使用してゲームの BoardState を取得し、8x8 のオセロ盤面を描画した 1200x630 ピクセルの PNG 画像を返却する
2. WHEN OGP_Image_Generator が候補詳細の OGP 画像リクエストを受信した時、THE OGP_Image_Generator SHALL 候補適用後の BoardState を取得し、候補の手の位置をハイライト表示した盤面を描画した 1200x630 ピクセルの PNG 画像を返却する
3. THE OGP_Image_Generator SHALL 盤面の黒石を黒色の円、白石を白色の円（灰色の枠線付き）、空セルを緑色の背景で描画する
4. THE OGP_Image_Generator SHALL 画像内にタイトルテキスト（ゲーム詳細: 「オセロ対局 - ターン{currentTurn}」、候補詳細: 「次の一手候補: {position}」）を表示する
5. THE OGP_Image_Generator SHALL 画像内に黒石と白石の数を表示する
6. IF API_Client からのデータ取得に失敗した場合、THEN THE OGP_Image_Generator SHALL プロダクト名「投票対局」とエラーメッセージを含むフォールバック画像を返却する
7. THE OGP_Image_Generator SHALL Edge Runtime で動作し、`@vercel/og`（ImageResponse）を使用して画像を生成する

### 要件 2: 特定ターン用 OGP 画像生成

**ユーザーストーリー:** 過去の特定ターンの盤面をシェアするユーザーとして、そのターン時点の盤面がサムネイルに表示されることで、議論の対象となる局面を正確に共有したい。

#### 受け入れ基準

1. WHEN OGP_Image_Generator が特定ターンの OGP 画像リクエスト（`/api/og/game/[gameId]/turn/[turnNumber]`）を受信した時、THE OGP_Image_Generator SHALL API_Client を使用して該当ターンの盤面データを取得し、盤面を描画した 1200x630 ピクセルの PNG 画像を返却する
2. THE OGP_Image_Generator SHALL 画像内にタイトルテキスト「オセロ対局 - ターン{turnNumber}」を表示する
3. IF 指定されたターン番号が存在しない場合、THEN THE OGP_Image_Generator SHALL フォールバック画像を返却する

### 要件 3: SNS 別シェアボタン

**ユーザーストーリー:** 対局や候補をシェアするユーザーとして、X（Twitter）や LINE など特定の SNS に直接シェアできるボタンがあることで、素早くシェアして議論を始めたい。

#### 受け入れ基準

1. THE Share_Button SHALL X（Twitter）へのシェアボタンを表示し、クリック時に `https://twitter.com/intent/tweet` にタイトルと URL をパラメータとして渡して新しいウィンドウで開く
2. THE Share_Button SHALL LINE へのシェアボタンを表示し、クリック時に `https://social-plugins.line.me/lineit/share` に URL をパラメータとして渡して新しいウィンドウで開く
3. THE Share_Button SHALL リンクコピーボタンを表示し、クリック時に Clipboard API を使用して URL をコピーし、コピー完了を 2 秒間表示する
4. IF Clipboard API が利用できない場合、THEN THE Share_Button SHALL エラーメッセージ「リンクのコピーに失敗しました」を表示する
5. THE Share_Button SHALL 各ボタンにアイコンとラベルテキストを表示し、`aria-label` 属性でアクセシビリティを確保する
6. THE Share_Button SHALL Game_Detail_Page、Turn_Detail_Page、Candidate_Detail_Page に配置される

### 要件 4: 対局詳細画面のメタタグ設定

**ユーザーストーリー:** 対局詳細画面のリンクを SNS に投稿するユーザーとして、適切なタイトル・説明・サムネイル画像が表示されることで、他のユーザーの関心を引きたい。

#### 受け入れ基準

1. THE Metadata_Generator SHALL Game_Detail_Page に対して `og:title` を「オセロ対局 - ターン{currentTurn}」に設定する
2. THE Metadata_Generator SHALL Game_Detail_Page に対して `og:description` を「AI vs 集合知の対局が進行中です」（ACTIVE 時）または「対局が終了しました」（FINISHED 時）に設定する
3. THE Metadata_Generator SHALL Game_Detail_Page に対して `og:image` を OGP_Image_Generator のエンドポイント URL に設定する
4. THE Metadata_Generator SHALL Game_Detail_Page に対して `twitter:card` を `summary_large_image` に設定する
5. WHEN Game_Detail_Page が Server Component として実装される場合、THE Metadata_Generator SHALL Next.js の `generateMetadata` 関数を使用してメタデータを生成する
6. IF API_Client からのデータ取得に失敗した場合、THEN THE Metadata_Generator SHALL フォールバックのメタデータ（タイトル: 「対局詳細 - 投票対局」）を返却する

### 要件 5: 特定ターン画面のメタタグ設定

**ユーザーストーリー:** 特定ターンの盤面リンクを SNS に投稿するユーザーとして、そのターンの情報がメタデータに反映されることで、議論の文脈を正確に伝えたい。

#### 受け入れ基準

1. THE Metadata_Generator SHALL Turn_Detail_Page に対して `og:title` を「オセロ対局 - ターン{turnNumber}」に設定する
2. THE Metadata_Generator SHALL Turn_Detail_Page に対して `og:description` を「ターン{turnNumber}の盤面」に設定する
3. THE Metadata_Generator SHALL Turn_Detail_Page に対して `og:image` を特定ターン用 OGP_Image_Generator のエンドポイント URL に設定する
4. THE Metadata_Generator SHALL Turn_Detail_Page に対して `twitter:card` を `summary_large_image` に設定する
5. THE Metadata_Generator SHALL Next.js の `generateMetadata` 関数を使用してメタデータを生成する

### 要件 6: 候補詳細画面のメタタグ改善

**ユーザーストーリー:** 候補詳細画面のリンクを SNS に投稿するユーザーとして、候補の手の位置と説明がメタデータに反映されることで、投票を促す議論を始めたい。

#### 受け入れ基準

1. THE Metadata_Generator SHALL Candidate_Detail_Page に対して `og:title` を「次の一手候補: {position}」に設定する
2. THE Metadata_Generator SHALL Candidate_Detail_Page に対して `og:description` を候補の説明文（最大 100 文字）に設定する
3. THE Metadata_Generator SHALL Candidate_Detail_Page に対して `og:image` を候補用 OGP_Image_Generator のエンドポイント URL に設定する（候補の手の位置をハイライト表示した盤面画像）
4. THE Metadata_Generator SHALL Candidate_Detail_Page に対して `twitter:card` を `summary_large_image` に設定する
5. THE Metadata_Generator SHALL 既存の `generateMetadata` 実装を維持しつつ、OGP 画像 URL が実際の盤面を描画するエンドポイントを参照するようにする

### 要件 7: OGP 画像のキャッシュ制御

**ユーザーストーリー:** システム運用者として、OGP 画像生成の負荷を抑えつつ、盤面の更新が適切に反映されるようにしたい。

#### 受け入れ基準

1. THE OGP_Image_Generator SHALL レスポンスヘッダーに `Cache-Control` を設定し、CDN でのキャッシュを有効にする
2. THE OGP_Image_Generator SHALL ACTIVE な対局の OGP 画像に対して `Cache-Control: public, max-age=3600, s-maxage=3600`（1 時間）を設定する
3. THE OGP_Image_Generator SHALL FINISHED な対局の OGP 画像に対して `Cache-Control: public, max-age=86400, s-maxage=86400`（24 時間）を設定する
4. THE OGP_Image_Generator SHALL 特定ターンの OGP 画像（過去の盤面で変更されない）に対して `Cache-Control: public, max-age=86400, s-maxage=86400`（24 時間）を設定する
