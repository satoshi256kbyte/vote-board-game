# Social Sharing E2E Tests

このディレクトリには、ソーシャルシェア機能とOGP（Open Graph Protocol）画像のE2Eテストが含まれています。

## テストファイル

### share-url.spec.ts

ソーシャルシェアURLの生成と共有コンテンツの表示をテストします。

**テストケース:**

1. **Share URL Generation（シェアURL生成）**
   - シェアボタンクリック時のURL生成
   - 有効なURL形式の検証
   - パフォーマンス（30秒以内）

2. **Shared Game URL Access（共有ゲームURLアクセス）**
   - 共有URLからの正しいゲーム状態表示
   - すべてのゲーム情報の表示
   - 共有ゲームとのインタラクション
   - パフォーマンス（30秒以内）

3. **Shared Candidate URL Access（共有候補URLアクセス）**
   - 共有URLからの正しい候補詳細表示
   - 候補説明文の表示
   - 共有URLからの投票機能
   - パフォーマンス（30秒以内）

### ogp-validation.spec.ts

OGPメタタグとOGP画像の有効性をテストします。

**テストケース:**

1. **OGP Meta Tags Validation（OGPメタタグ検証）**
   - og:title、og:description、og:image、og:urlの存在確認
   - og:typeの設定確認
   - ゲーム情報を含むog:title
   - ゲーム詳細を含むog:description
   - 正しいゲームURLを含むog:url
   - パフォーマンス（30秒以内）

2. **OGP Image Validation（OGP画像検証）**
   - og:imageメタタグのURL存在確認
   - 有効なog:image URL形式
   - og:image URLからの有効な画像レスポンス
   - og:image:widthとog:image:heightの設定（オプション）
   - og:image:altのアクセシビリティ対応（オプション）
   - パフォーマンス（30秒以内）

3. **Twitter Card Meta Tags（Twitterカードメタタグ）**
   - twitter:cardメタタグの存在確認
   - 有効なtwitter:cardタイプ
   - twitter:imageメタタグの存在確認

## 要件との対応

### 要件11: ソーシャルシェアフローのテスト

- ✅ 11.1: シェアボタンクリック時のシェアURL生成を検証
- ✅ 11.2: 共有ゲームURLアクセス時の正しいゲーム状態表示を検証
- ✅ 11.3: 共有候補URLアクセス時の正しい候補詳細表示を検証
- ✅ 11.4: HTMLにOGPメタタグが存在することを検証
- ✅ 11.5: OGP画像URLが有効な画像を返すことを検証

### 要件8: テスト実行パフォーマンス

- ✅ 8.2: 各テストケースが30秒以内に完了することを確認

## 使用しているPage Object Models

- `GameDetailPage`: ゲーム詳細ページの操作
  - `goto()`: ゲーム詳細ページへの遷移
  - `clickShare()`: シェアボタンのクリック
  - `getShareUrl()`: シェアURLの取得
  - `expectBoardStateVisible()`: 盤面状態の表示確認
  - `expectMoveHistoryVisible()`: 手の履歴の表示確認
  - `expectAICommentaryVisible()`: AI解説の表示確認
  - `expectJoinButtonVisible()`: 参加ボタンの表示確認

- `VotingPage`: 投票ページの操作
  - `goto()`: 投票ページへの遷移
  - `expectCandidatesVisible()`: 候補一覧の表示確認

## 使用しているFixtures

- `authenticatedUser`: 認証済みユーザーフィクスチャ
  - `authenticatedPage`: ログイン済みのPageインスタンス
  - `testUser`: テストユーザーの認証情報

- `testGame`: テストゲームフィクスチャ
  - `game`: アクティブなテストゲーム

## テストの実行

### 前提条件

1. アプリケーションが起動していること
2. `BASE_URL`環境変数が設定されていること
3. Cognitoテストユーザープールが利用可能であること
4. DynamoDBテストテーブルが利用可能であること

### ローカル実行

```bash
# すべてのシェアリングテストを実行
BASE_URL=http://localhost:3000 pnpm test:e2e e2e/sharing/

# 特定のテストファイルを実行
BASE_URL=http://localhost:3000 pnpm test:e2e e2e/sharing/share-url.spec.ts
BASE_URL=http://localhost:3000 pnpm test:e2e e2e/sharing/ogp-validation.spec.ts

# ヘッドモードで実行（ブラウザを表示）
BASE_URL=http://localhost:3000 pnpm test:e2e:headed e2e/sharing/

# UIモードで実行（デバッグ用）
BASE_URL=http://localhost:3000 pnpm test:e2e:ui e2e/sharing/
```

### CI/CD実行

```bash
# CI環境での実行
CI=true BASE_URL=https://test.example.com pnpm test:e2e e2e/sharing/
```

## 実装の詳細

### シェアURL生成のテスト

シェアボタンをクリックすると、`game-share-url`というdata-testidを持つ要素にシェアURLが表示されます。テストでは以下を検証します：

1. シェアURLが表示されること
2. URLにゲームIDが含まれること
3. URL形式が正しいこと（`/games/{gameId}`）

### OGPメタタグのテスト

ページのHTMLコンテンツを取得し、以下のOGPメタタグの存在を確認します：

- `og:title`: ページタイトル
- `og:description`: ページ説明
- `og:image`: OGP画像URL
- `og:url`: ページURL
- `og:type`: コンテンツタイプ

### OGP画像の検証

OGP画像URLに対してHTTPリクエストを送信し、以下を検証します：

1. HTTPステータスコードが200であること
2. Content-Typeが画像形式であること
3. URL形式が正しいこと（画像拡張子を含む）

### Twitterカードのテスト

Twitterカード用のメタタグも検証します：

- `twitter:card`: カードタイプ（summary、summary_large_imageなど）
- `twitter:image`: Twitter用画像URL（og:imageにフォールバック可能）

## トラブルシューティング

### テストが失敗する場合

1. **BASE_URLが設定されていない**
   - エラー: `BASE_URL environment variable is required`
   - 解決: `BASE_URL`環境変数を設定してください

2. **アプリケーションが起動していない**
   - エラー: `Frontend not accessible`
   - 解決: アプリケーションを起動してください

3. **OGPメタタグが見つからない**
   - エラー: `Expected HTML to contain 'og:title'`
   - 解決: Next.jsのメタデータ設定を確認してください

4. **OGP画像URLが無効**
   - エラー: `Expected response to be ok`
   - 解決: OGP画像生成機能が正しく動作しているか確認してください

### デバッグ方法

1. **UIモードで実行**

   ```bash
   BASE_URL=http://localhost:3000 pnpm test:e2e:ui e2e/sharing/
   ```

2. **ヘッドモードで実行**

   ```bash
   BASE_URL=http://localhost:3000 pnpm test:e2e:headed e2e/sharing/
   ```

3. **スクリーンショットを確認**
   - 失敗時のスクリーンショットは`test-results/`ディレクトリに保存されます

4. **トレースを確認**
   - トレースファイルは`test-results/`ディレクトリに保存されます
   - `pnpm test:e2e:report`でレポートを表示できます

## 注意事項

1. **OGP画像生成**
   - OGP画像は動的に生成されるため、生成機能が実装されている必要があります
   - @vercel/ogまたはsatoriを使用して盤面のサムネイル画像を生成します

2. **メタタグの実装**
   - Next.js App Routerの`metadata` APIを使用してOGPメタタグを設定します
   - 各ページで適切なメタデータを設定する必要があります

3. **パフォーマンス**
   - 各テストは30秒以内に完了する必要があります
   - ネットワーク遅延やサーバー応答時間に注意してください

4. **クロスブラウザテスト**
   - Chromium、Firefox、WebKitの3つのブラウザでテストが実行されます
   - ブラウザ固有の問題に注意してください

## 参考資料

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Playwright Testing](https://playwright.dev/docs/intro)
