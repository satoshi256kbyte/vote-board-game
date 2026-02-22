# 実装計画: JWTトークン検証ミドルウェア

## 概要

投票ボードゲームアプリケーションのJWTトークン検証ミドルウェアを実装します。Honoミドルウェアとして、CognitoのJWKSエンドポイントから公開鍵を取得し、JWTトークンの署名・クレーム・有効期限を検証します。

実装は以下の順序で進めます:

1. 型定義とJWKSキャッシュの実装
2. JWT検証ミドルウェアの実装
3. ルート保護設定（index.tsへの適用）
4. テスト（ユニットテスト + プロパティベーステスト）

## タスク

- [-] 1. joseライブラリのインストールと型定義
  - [x] 1.1 joseパッケージをインストール
    - `packages/api`ディレクトリで`pnpm add jose`を実行
    - JWT署名検証とJWKインポートに使用
  - [x] 1.2 型定義ファイルを作成
    - `packages/api/src/lib/auth/types.ts`を作成
    - `AuthVariables`インターフェース: userId(string)、email(string | undefined)、username(string | undefined)
    - `CognitoAccessTokenPayload`インターフェース: sub、iss、token_use、exp、iat、email?、preferred_username?
    - `AuthMiddlewareConfig`インターフェース: userPoolId、region
    - `JwksCacheEntry`インターフェース: keys(JsonWebKey[])、fetchedAt(number)
    - _要件: 9.1, 9.2, 9.3_
  - [-] 1.3 エクスポートファイルを作成
    - `packages/api/src/lib/auth/index.ts`を作成
    - createAuthMiddleware、AuthVariables、AuthMiddlewareConfig、CognitoAccessTokenPayloadをエクスポート

- [ ] 2. JWKSキャッシュの実装
  - [~] 2.1 JwksCacheクラスを実装
    - `packages/api/src/lib/auth/jwks-cache.ts`を作成
    - コンストラクタ: jwksUrl(string)を受け取る
    - `getKeys()`メソッド: キャッシュ有効時はキャッシュを返す、期限切れ時はfetchして更新
    - キャッシュTTL: 1時間（3,600,000ミリ秒）
    - フォールバック: fetch失敗時に期限切れキャッシュがあれば使用、なければエラーをスロー
    - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [~] 2.2 JwksCacheのユニットテストを作成
    - `packages/api/src/lib/auth/jwks-cache.test.ts`を作成
    - キャッシュヒット: 2回目の呼び出しでfetchが発生しないことを検証
    - キャッシュ期限切れ: TTL経過後にfetchが再発生することを検証
    - フォールバック: fetch失敗時に期限切れキャッシュを返すことを検証
    - キャッシュなしエラー: fetch失敗かつキャッシュなし時にエラーをスローすることを検証
    - global.fetchをモック
    - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 3. JWT検証ミドルウェアの実装
  - [~] 3.1 createAuthMiddlewareファクトリ関数を実装
    - `packages/api/src/lib/auth/auth-middleware.ts`を作成
    - `extractBearerToken`ヘルパー関数: Authorizationヘッダーからトークンを抽出
    - `getKidFromToken`ヘルパー関数: JWTヘッダーからkidを取得
    - `createAuthMiddleware(config)`: AuthMiddlewareConfigを受け取りHonoミドルウェアを返す
    - Authorizationヘッダー検証: なし→401、Bearer形式でない→401、トークン空→401
    - JWKS取得: JwksCacheを使用、失敗時→500
    - kid検索: 不一致→401
    - 署名検証: joseのjwtVerifyを使用、issuer検証を含む
    - token_use検証: accessでない→401
    - 有効期限検証: 期限切れ→401 TOKEN_EXPIRED
    - 認証コンテキスト設定: sub→userId、email→email、preferred_username→username
    - ログ: トークン文字列・ペイロード非出力、エラー種類のみ記録
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_
  - [~] 3.2 エクスポートファイルを更新
    - `packages/api/src/lib/auth/index.ts`にcreateAuthMiddlewareのエクスポートを追加

- [ ] 4. ルート保護設定
  - [~] 4.1 index.tsにミドルウェアを適用
    - `packages/api/src/index.ts`を修正
    - 環境変数チェック: COGNITO_USER_POOL_IDが未設定の場合エラーをスロー
    - createAuthMiddlewareでミドルウェアを生成
    - `/api/votes/*`にミドルウェアを適用
    - `/api/candidates`のPOSTのみにミドルウェアを適用（GETは公開）
    - `/api/games/*`、`/auth/*`、`/health`には適用しない
    - AuthVariables型をHonoアプリの型パラメータに追加
    - _要件: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.5_

- [ ] 5. チェックポイント - 基礎実装の確認
  - すべてのファイルが正しく作成され、型チェックが通ることを確認してください。質問があればユーザーに確認してください。

- [ ] 6. ユニットテスト
  - [~] 6.1 ミドルウェアのユニットテストを作成
    - `packages/api/src/lib/auth/auth-middleware.test.ts`を作成
    - Authorizationヘッダーなし→401 UNAUTHORIZED "Authorization header is required"
    - Bearer形式でない→401 UNAUTHORIZED "Invalid authorization format"
    - トークン空→401 UNAUTHORIZED "Token is required"
    - 有効なトークン→認証成功、コンテキストにuserId/email/username設定
    - emailなしトークン→email=undefined
    - preferred_usernameなしトークン→username=undefined
    - 署名不正→401 UNAUTHORIZED "Invalid token"
    - kid不一致→401 UNAUTHORIZED "Invalid token"
    - iss不正→401 UNAUTHORIZED "Invalid token"
    - token_use不正→401 UNAUTHORIZED "Invalid token"
    - 有効期限切れ→401 TOKEN_EXPIRED "Token has expired"
    - JWKS取得失敗（キャッシュなし）→500 INTERNAL_ERROR "Authentication service unavailable"
    - joseとJwksCacheをモック
    - _要件: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.6, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_
  - [~] 6.2 ルート保護設定のユニットテストを作成
    - `packages/api/src/index.test.ts`に追加（または新規ファイル）
    - `/api/votes`にAuthorizationヘッダーなしでPOST→401
    - `POST /api/candidates`にAuthorizationヘッダーなし→401
    - `GET /api/candidates`にAuthorizationヘッダーなし→200（公開）
    - `GET /api/games`にAuthorizationヘッダーなし→200（公開）
    - `GET /health`にAuthorizationヘッダーなし→200（公開）
    - `/auth/register`にAuthorizationヘッダーなし→認証不要
    - _要件: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [~] 6.3 環境変数チェックのユニットテストを作成
    - COGNITO_USER_POOL_ID未設定時にエラーがスローされることを検証
    - _要件: 8.5_

- [ ] 7. プロパティベーステスト
  - [~] 7.1 プロパティテスト: Bearerトークン抽出の正当性
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`を作成
    - **プロパティ1: Bearerトークン抽出の正当性**
    - 任意の文字列tokenに対して、`Bearer ${token}`から抽出した結果がtokenと一致
    - Bearer で始まらない任意の文字列に対して、抽出が失敗
    - fast-checkでランダムなトークン文字列を生成
    - **検証: 要件 1.1, 1.3**
  - [~] 7.2 プロパティテスト: JWKSエンドポイントURL構築
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ2: JWKSエンドポイントURL構築**
    - 任意のregionとuserPoolIdに対して、正しいURL形式が生成される
    - **検証: 要件 2.1, 8.4**
  - [~] 7.3 プロパティテスト: 署名検証の正当性
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ3: 署名検証の正当性**
    - 正しい鍵で署名されたトークンは検証成功、異なる鍵で署名されたトークンは401
    - **検証: 要件 2.2, 2.3, 2.4**
  - [~] 7.4 プロパティテスト: クレーム検証
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ4: クレーム検証**
    - issとtoken_useが正しいトークンは通過、不正なトークンは401
    - **検証: 要件 3.1, 3.2, 3.4, 3.5**
  - [~] 7.5 プロパティテスト: 有効期限切れトークンのエラーコード区別
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ5: 有効期限切れトークンのエラーコード区別**
    - 期限切れトークンに対してTOKEN_EXPIREDが返る（UNAUTHORIZEDではない）
    - **検証: 要件 3.3, 3.6**
  - [~] 7.6 プロパティテスト: 認証コンテキストのラウンドトリップ
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ6: 認証コンテキストのラウンドトリップ**
    - 任意のクレーム値に対して、コンテキストから取得した値が元のクレーム値と一致
    - **検証: 要件 4.1, 4.2, 4.3, 4.4**
  - [~] 7.7 プロパティテスト: エラーレスポンス形式の一貫性
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ7: エラーレスポンス形式の一貫性**
    - 任意の認証エラーに対して、errorとmessageフィールドを含み、トークン情報を含まない
    - **検証: 要件 7.1, 7.2, 7.3, 7.4**
  - [~] 7.8 プロパティテスト: ログセキュリティ
    - `packages/api/src/lib/auth/auth-middleware.property.test.ts`に追加
    - **プロパティ8: ログセキュリティ**
    - 任意のリクエストに対して、ログにトークン文字列・ペイロード全体が含まれない
    - **検証: 要件 8.1, 8.2, 8.3**

- [ ] 8. 最終チェックポイント
  - すべてのテストが通過することを確認し、質問があればユーザーに確認してください。

## 注意事項

- `jose`ライブラリを使用してJWT署名検証を行います（自前実装は行わない）
- JWKSキャッシュは`jose`の`createRemoteJWKSet`ではなく自前で管理します（TTLとフォールバック制御のため）
- 既存のエラーレスポンス形式（error + message）に準拠します
- `any`型は使用しません（要件9.3）
- `*`マーク付きタスクはオプションでスキップ可能です
- 各タスクは具体的な要件を参照しトレーサビリティを確保しています
- プロパティテストは普遍的な正確性プロパティを検証します
- ユニットテストは特定の例とエッジケースを検証します
