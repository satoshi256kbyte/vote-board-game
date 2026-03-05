# E2Eテストタイムアウト問題 Bugfix Design

## Overview

GitHub Actions CI環境で実行されるE2Eテスト（Playwright）が、ゲーム作成後のリダイレクトに失敗し、24個のテストがタイムアウトエラーで失敗しています。ローカル環境では正常に動作しますが、CI環境では `page.content: Target page, context or browser has been closed` エラーが発生します。

この問題は、ゲーム作成API呼び出しが失敗または予期しないレスポンスを返すことで、`/games/{gameId}` へのリダイレクトが実行されず、`/games/new` ページに留まり続けることが原因です。修正には反復的なデバッグプロセスが必要で、GitHub Actionsログを確認しながら段階的に問題を特定・解決していきます。

## Glossary

- **Bug_Condition (C)**: CI環境でゲーム作成フォームを送信したときに、APIレスポンスが失敗またはエラーを返す条件
- **Property (P)**: ゲーム作成が成功し、ゲーム詳細ページへ正しくリダイレクトされる動作
- **Preservation**: ローカル環境での正常動作、認証フロー、その他のAPI呼び出しの動作
- **createGame**: `packages/web/src/lib/api/client.ts` のゲーム作成API呼び出し関数
- **handleSubmit**: `packages/web/src/app/games/new/page.tsx` のフォーム送信ハンドラー
- **NEXT_PUBLIC_API_URL**: フロントエンドからAPIエンドポイントを指定する環境変数
- **DynamoDB Eventual Consistency**: DynamoDBの結果整合性により、書き込み直後の読み取りでデータが取得できない可能性がある特性

## Bug Details

### Fault Condition

バグは、GitHub Actions CI環境でユーザーがゲーム作成フォームを送信したときに発生します。`createGame` API呼び出しが失敗、タイムアウト、または予期しないレスポンスを返すことで、`router.push(\`/games/${game.gameId}\`)`が実行されず、ユーザーは`/games/new` ページに留まり続けます。

**Formal Specification:**

```pseudocode
FUNCTION isBugCondition(input)
  INPUT: input of type { environment: string, formSubmission: GameCreationRequest }
  OUTPUT: boolean

  RETURN input.environment == 'CI'
         AND input.formSubmission.submitted == true
         AND (apiCallFails(input) OR apiReturnsInvalidResponse(input) OR apiTimesOut(input))
         AND NOT redirectExecuted('/games/{gameId}')
END FUNCTION
```

### Examples

- **例1**: CI環境でゲーム作成フォームを送信 → API呼び出しがネットワークエラーで失敗 → エラーメッセージが表示されるが、リダイレクトされない → E2Eテストが30秒タイムアウト
- **例2**: CI環境でゲーム作成フォームを送信 → APIが500エラーを返す → コンソールにエラーログが出力されるが、ページは `/games/new` に留まる → テストが失敗
- **例3**: CI環境でゲーム作成フォームを送信 → APIが不正なJSON（gameIdなし）を返す → JavaScriptエラーが発生し、リダイレクトが実行されない → テストがタイムアウト
- **例4**: CI環境でゲーム作成フォームを送信 → CORS設定の問題でAPIリクエストがブロックされる → ネットワークエラーが発生し、リダイレクトされない → テストが失敗

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- ローカル開発環境でのゲーム作成フローは引き続き正常に動作する
- ゲーム作成が成功した場合の `/games/{gameId}` へのリダイレクトは引き続き正しく動作する
- 認証されていないユーザーのログインページへのリダイレクトは引き続き正常に動作する
- APIクライアントの他の関数（fetchGames, fetchGame, createCandidate, vote）は引き続き正常に動作する
- エラーハンドリングの既存動作（エラーメッセージ表示、ボタンの再有効化）は引き続き正常に動作する

**Scope:**

CI環境でのゲーム作成API呼び出し以外のすべての動作は、この修正の影響を受けません。これには以下が含まれます：

- ローカル環境でのすべての操作
- 他のAPIエンドポイントへの呼び出し
- 認証フロー
- ページナビゲーション（ゲーム作成以外）
- フォームバリデーション

## Hypothesized Root Cause

バグの説明とコード分析に基づき、最も可能性の高い原因は以下の通りです：

1. **環境変数の設定ミス**: CI環境で `NEXT_PUBLIC_API_URL` が正しく設定されていない、または静的ビルド時に環境変数が埋め込まれていない
   - Next.js静的エクスポートでは、ビルド時に環境変数が埋め込まれる
   - CI環境でVercelにデプロイされたアプリケーションが、正しいAPI URLを持っていない可能性

2. **CORS設定の問題**: API GatewayまたはLambdaのCORS設定が、Vercelのデプロイメントドメインからのリクエストを許可していない
   - ローカル環境（localhost）は許可されているが、Vercel URL（\*.vercel.app）が許可されていない可能性

3. **API認証の問題**: ゲーム作成エンドポイントが認証を要求しているが、CI環境でのリクエストに認証トークンが含まれていない
   - 現在のコードでは `createGame` 関数がAuthorizationヘッダーを送信していない

4. **ネットワークタイムアウト**: CI環境からAWSリソースへのネットワーク接続が遅く、デフォルトのタイムアウト前にレスポンスが返らない
   - Lambda関数のコールドスタートが原因の可能性

5. **DynamoDB結果整合性**: ゲーム作成直後にゲーム詳細ページでデータを取得しようとするが、DynamoDBの結果整合性により、データがまだ利用できない
   - これはリダイレクト後の問題であり、リダイレクト自体が実行されない現在の症状とは異なる

## Correctness Properties

Property 1: Fault Condition - CI環境でのゲーム作成成功

_For any_ CI環境でのゲーム作成フォーム送信において、APIが正常にゲームを作成し、有効なgameIdを含むレスポンスを返す場合、修正後のシステムは `/games/{gameId}` ページへ正しくリダイレクトし、E2Eテストが成功する。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - ローカル環境とその他の機能

_For any_ ローカル開発環境でのゲーム作成、または他のAPI呼び出し（ゲーム一覧取得、候補作成、投票など）において、修正後のシステムは修正前と同じ動作を維持し、既存の機能に影響を与えない。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

根本原因の仮説に基づき、以下の変更を段階的に実施します。各変更後にGitHub Actionsログを確認し、問題を特定します。

**反復的デバッグプロセス:**

1. 詳細なデバッグログを追加
2. GitHubへプッシュ
3. GitHub Actions E2Eテストワークフローの実行を待機
4. Actionsログを確認して問題を分析
5. 次の修正方針を決定
6. 修正を実装
7. 1に戻る（問題が解決するまで）

### Phase 1: デバッグログの追加

**File**: `packages/web/src/lib/api/client.ts`

**Function**: `createGame`

**Specific Changes**:

1. **詳細なリクエストログ**: API呼び出し前に、URL、ヘッダー、ボディを記録
2. **レスポンスログ**: レスポンスステータス、ヘッダー、ボディを記録
3. **エラーログの強化**: エラー発生時に、エラーの種類、メッセージ、スタックトレースを記録
4. **環境変数の確認ログ**: `getApiBaseUrl()` が返すURLを記録

**File**: `packages/web/src/app/games/new/page.tsx`

**Function**: `handleSubmit`

**Specific Changes**:

1. **フォーム送信開始ログ**: 送信時のaiSide値を記録
2. **API呼び出し成功ログ**: 返されたgameIdを記録
3. **リダイレクト実行ログ**: リダイレクト先URLを記録
4. **エラーハンドリングログの強化**: エラーの詳細情報を記録

### Phase 2: 環境変数の検証と修正

**File**: `.github/workflows/e2e-game.yml`

**Specific Changes**:

1. **環境変数の出力**: `.env.test` ファイルの内容を確認（機密情報はマスク）
2. **Vercelデプロイメントの環境変数確認**: Vercel CLIまたはAPIを使用して、デプロイされたアプリケーションの環境変数を確認
3. **ビルド時の環境変数注入**: 必要に応じて、Vercelデプロイメント時に環境変数を正しく設定

**File**: `packages/web/src/lib/api/client.ts`

**Function**: `getApiBaseUrl`

**Specific Changes**:

1. **フォールバック処理の改善**: 環境変数が未定義の場合、より詳細なエラーメッセージを出力
2. **環境変数の検証**: URLの形式が正しいかチェック（http/httpsで始まるか）

### Phase 3: CORS設定の確認と修正

**File**: `packages/api/src/index.ts` (Honoアプリケーション)

**Specific Changes**:

1. **CORSミドルウェアの確認**: 現在のCORS設定を確認し、Vercel URLが許可されているか検証
2. **CORS設定の拡張**: 必要に応じて、`*.vercel.app` ドメインを許可リストに追加
3. **プリフライトリクエストの処理**: OPTIONSリクエストが正しく処理されているか確認

### Phase 4: 認証トークンの追加

**File**: `packages/web/src/lib/api/client.ts`

**Function**: `createGame`, `createCandidate`, `vote`

**Specific Changes**:

1. **認証トークンの取得**: Cognitoから取得したJWTトークンを取得する関数を実装
2. **Authorizationヘッダーの追加**: API呼び出し時に `Authorization: Bearer {token}` ヘッダーを追加
3. **トークンエラーハンドリング**: トークンが無効または期限切れの場合の処理を追加

### Phase 5: タイムアウトとリトライの実装

**File**: `packages/web/src/lib/api/client.ts`

**All API functions**

**Specific Changes**:

1. **タイムアウトの設定**: fetch呼び出しに `signal` を使用してタイムアウトを設定（例: 30秒）
2. **リトライロジック**: API呼び出しが失敗した場合、指数バックオフでリトライ（最大3回）
3. **リトライ対象エラーの判定**: ネットワークエラーや5xxエラーのみリトライ、4xxエラーはリトライしない

### Phase 6: DynamoDB結果整合性への対応

**File**: `packages/web/src/app/games/[gameId]/page.tsx`

**Specific Changes**:

1. **リトライロジックの追加**: ゲームデータの取得に失敗した場合、短い間隔でリトライ（最大5回、各1秒間隔）
2. **ローディング状態の改善**: データ取得中のローディング表示を改善
3. **エラーメッセージの改善**: データが見つからない場合の明確なエラーメッセージ

## Testing Strategy

### Validation Approach

テスト戦略は、反復的デバッグプロセスに従います。各修正後にGitHub Actions E2Eテストを実行し、ログを分析して問題を特定します。最終的に、すべてのE2Eテストが成功することを確認します。

### Exploratory Fault Condition Checking

**Goal**: CI環境でのゲーム作成API呼び出しの失敗原因を特定する。デバッグログを追加し、GitHub Actionsログから詳細情報を収集する。

**Test Plan**:

1. デバッグログを追加したコードをGitHubにプッシュ
2. GitHub Actions E2Eテストワークフローを実行
3. ワークフローログから以下の情報を収集：
   - API URL（環境変数の値）
   - リクエストの詳細（URL、ヘッダー、ボディ）
   - レスポンスの詳細（ステータス、ヘッダー、ボディ）
   - エラーメッセージとスタックトレース
4. ログを分析し、根本原因を特定
5. 特定された原因に基づいて修正を実装
6. 1に戻る（問題が解決するまで）

**Test Cases**:

1. **環境変数の確認**: `NEXT_PUBLIC_API_URL` の値がログに出力されるか（期待: 正しいAPI Gateway URL）
2. **API呼び出しの確認**: リクエストが正しいエンドポイントに送信されているか（期待: POST /api/games）
3. **レスポンスの確認**: APIが正常なレスポンスを返しているか（期待: 201 Created、gameIdを含むJSON）
4. **CORSエラーの確認**: ブラウザコンソールにCORSエラーが出力されていないか（期待: CORSエラーなし）

**Expected Counterexamples**:

- API URLが未定義または不正（例: `undefined`, `http://localhost:3001`）
- CORSエラーが発生（例: `Access-Control-Allow-Origin` ヘッダーがない）
- 認証エラーが発生（例: 401 Unauthorized）
- ネットワークタイムアウトが発生（例: `fetch failed`）

### Fix Checking

**Goal**: 修正後、CI環境でゲーム作成が成功し、ゲーム詳細ページへリダイレクトされることを確認する。

**Pseudocode:**

```pseudocode
FOR ALL gameCreationRequest IN CI_environment DO
  result := createGame(gameCreationRequest)
  ASSERT result.gameId IS valid_uuid
  ASSERT redirectExecuted('/games/' + result.gameId)
  ASSERT gameDetailPageLoaded()
END FOR
```

**Test Plan**:

1. 修正をGitHubにプッシュ
2. GitHub Actions E2Eテストワークフローを実行
3. すべてのゲーム作成E2Eテストが成功することを確認
4. テストログから、リダイレクトが正しく実行されたことを確認
5. ゲーム詳細ページが正しく表示されたことを確認

### Preservation Checking

**Goal**: 修正後、ローカル環境でのゲーム作成、および他のAPI呼び出しが引き続き正常に動作することを確認する。

**Pseudocode:**

```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT operation_after_fix() = operation_before_fix()
END FOR
```

**Testing Approach**: ローカル環境でのE2Eテストと単体テストを実行し、既存の機能が影響を受けていないことを確認します。

**Test Plan**:

1. ローカル環境でE2Eテストを実行（`pnpm test:e2e:game`）
2. すべてのテストが成功することを確認
3. 単体テストを実行（`pnpm test`）
4. すべてのテストが成功することを確認
5. 手動テスト: ローカル環境でゲーム作成フローを実行し、正常に動作することを確認

**Test Cases**:

1. **ローカル環境でのゲーム作成**: ゲーム作成フォームを送信し、ゲーム詳細ページへリダイレクトされることを確認
2. **ゲーム一覧取得**: `fetchGames` が引き続き正常に動作することを確認
3. **ゲーム詳細取得**: `fetchGame` が引き続き正常に動作することを確認
4. **候補作成**: `createCandidate` が引き続き正常に動作することを確認
5. **投票**: `vote` が引き続き正常に動作することを確認
6. **認証フロー**: 未認証ユーザーがログインページへリダイレクトされることを確認

### Unit Tests

- API呼び出し関数（createGame, fetchGame, fetchGames）の単体テスト
- エラーハンドリングの単体テスト（ApiErrorクラス、handleResponse関数）
- 環境変数取得関数（getApiBaseUrl）の単体テスト
- リトライロジックの単体テスト（実装する場合）

### Property-Based Tests

- ランダムなゲーム作成リクエストを生成し、API呼び出しが正しく動作することを検証
- ランダムなエラーレスポンスを生成し、エラーハンドリングが正しく動作することを検証
- ランダムな環境変数の値を生成し、getApiBaseUrlが正しく動作することを検証

### Integration Tests

- CI環境でのE2Eテスト（GitHub Actions）
- ローカル環境でのE2Eテスト
- API統合テスト（実際のAWSリソースを使用）
- 認証統合テスト（Cognitoとの連携）

### GitHub Actions ログ確認プロセス

各イテレーションで以下の手順を実施：

1. **コードの修正**: デバッグログの追加または問題の修正
2. **GitHubへプッシュ**: 修正をリモートリポジトリにプッシュ
3. **ワークフロー実行**: GitHub Actions E2Eテストワークフローを手動またはプッシュトリガーで実行
4. **ログの確認**:
   - ワークフローの各ステップのログを確認
   - ブラウザコンソールログを確認（Playwrightが出力）
   - APIレスポンスログを確認
   - エラーメッセージとスタックトレースを確認
5. **問題の分析**: ログから根本原因を特定
6. **次の修正方針の決定**: 分析結果に基づいて次の修正内容を決定
7. **1に戻る**: 問題が解決するまで繰り返す

### デバッグログの例

```typescript
// API呼び出し前
console.log('[createGame] Request:', {
  url,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  apiBaseUrl: getApiBaseUrl(),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});

// レスポンス受信後
console.log('[createGame] Response:', {
  status: response.status,
  statusText: response.statusText,
  headers: Object.fromEntries(response.headers.entries()),
  url: response.url,
});

// エラー発生時
console.error('[createGame] Error:', {
  name: error.name,
  message: error.message,
  stack: error.stack,
  cause: error.cause,
});
```
