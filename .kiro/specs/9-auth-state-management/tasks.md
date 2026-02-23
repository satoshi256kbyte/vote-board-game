# Implementation Plan: 認証状態管理 (Auth State Management)

## 概要

本実装計画は、投票ボードゲームアプリケーションのフロントエンド認証状態管理機能を実装するためのタスクリストです。既存の AuthContext / AuthProvider / useAuth / AuthService / StorageService を拡張し、トークンライフサイクル管理、自動リフレッシュ、アクセス制御、ログアウト、認証付き API リクエストを統合的に提供します。実装は TypeScript、Next.js 16 App Router、React 19、Vitest、React Testing Library、fast-check を使用します。

## タスク

- [ ] 1. 型定義の拡張と StorageService の拡張
  - [ ] 1.1 AuthContextType、AuthState、RefreshResponse の型定義を追加・拡張
    - packages/web/src/lib/types/auth.ts に AuthState、RefreshResponse インターフェースを追加
    - AuthContextType に isLoading、login、logout を追加
    - _要件: 1.4, 1.5, 3.2, 4.2_

  - [ ] 1.2 StorageService にユーザー情報永続化メソッドを追加
    - packages/web/src/lib/services/storage-service.ts に setUser、getUser、removeUser、clearAll メソッドを追加
    - USER_KEY = 'vbg_user' 定数を追加
    - setUser: JSON.stringify して localStorage に保存
    - getUser: JSON.parse して返す。パース失敗時は null を返し不正データを削除
    - clearAll: vbg_access_token、vbg_refresh_token、vbg_user を一括削除
    - _要件: 2.1, 2.2, 2.3, 2.4_

  - [ ]\* 1.3 StorageService のプロパティベーステストを作成
    - packages/web/src/lib/services/storage-service.property.test.ts を作成
    - **Property 2: ユーザー情報シリアライズの往復一貫性**
    - **検証: 要件 2.1, 2.3**

  - [ ]\* 1.4 StorageService の不正 JSON ハンドリングのプロパティベーステストを作成
    - **Property 3: 不正 JSON のグレースフルハンドリング**
    - **検証: 要件 2.4**

  - [ ]\* 1.5 StorageService の全データクリアのプロパティベーステストを作成
    - **Property 4: ログアウトによる全認証データのクリア**
    - **検証: 要件 2.2, 4.1**

- [ ] 2. チェックポイント - StorageService のテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

- [ ] 3. AuthService の拡張
  - [ ] 3.1 AuthService にトークンリフレッシュメソッドを追加
    - packages/web/src/lib/services/auth-service.ts に refreshToken メソッドを追加
    - POST /auth/refresh エンドポイントへの API 呼び出しを実装
    - RefreshResponse（accessToken, expiresIn）を返す
    - 成功時に StorageService.setAccessToken で新しいトークンを保存
    - _要件: 3.2, 3.3_

  - [ ] 3.2 AuthService に認証付きリクエストメソッドを追加
    - packages/web/src/lib/services/auth-service.ts に authenticatedFetch メソッドを追加
    - Authorization ヘッダーに Bearer トークン形式で AccessToken を付与
    - AccessToken 未存在時はエラーをスロー
    - 401 レスポンス時にトークンリフレッシュを試行し、成功時は元のリクエストを再実行
    - リフレッシュ後の再実行でも 401 の場合はログアウト処理を実行
    - _要件: 8.1, 8.2, 8.3, 8.4_

  - [ ] 3.3 AuthService の logout メソッドを StorageService.clearAll を使用するよう変更
    - 既存の logout メソッドを clearAll() を使用するよう修正
    - _要件: 4.1_

  - [ ]\* 3.4 AuthService のトークンリフレッシュのプロパティベーステストを作成
    - packages/web/src/lib/services/auth-service.property.test.ts を拡張
    - **Property 7: リフレッシュ後のトークン永続化**
    - **検証: 要件 3.3**

  - [ ]\* 3.5 AuthService の認証付きリクエストのプロパティベーステストを作成
    - **Property 12: 認証付きリクエストの Bearer トークン付与**
    - **検証: 要件 8.1**

  - [ ]\* 3.6 AuthService のユニットテストを拡張
    - packages/web/src/lib/services/auth-service.test.ts を拡張
    - refreshToken 成功・失敗のテスト
    - authenticatedFetch の Bearer トークン付与テスト
    - AccessToken 未存在時のエラーテスト
    - 401 後のリフレッシュ＋リトライフローのテスト
    - リフレッシュ後再 401 でのログアウトテスト
    - logout メソッドの clearAll 使用テスト
    - _要件: 3.2, 3.3, 4.1, 8.1, 8.2, 8.3, 8.4_

- [ ] 4. チェックポイント - AuthService のテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

- [ ] 5. AuthProvider の大幅拡張
  - [ ] 5.1 AuthProvider に認証状態の初期化・復元ロジックを実装
    - packages/web/src/lib/contexts/auth-context.tsx を拡張
    - マウント時に StorageService から AccessToken とユーザー情報を読み込み
    - 有効なトークン＋ユーザー情報がある場合は isAuthenticated を true、user にユーザー情報を設定
    - トークンがない場合は isAuthenticated を false、user を null に設定
    - 初期化中は isLoading を true、完了後に false に設定
    - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 5.2 AuthProvider にトークン自動リフレッシュロジックを実装
    - 認証済み状態でマウント時に AccessToken の有効期限 60 秒前にリフレッシュをスケジュール
    - リフレッシュ成功時に新しいトークンを保存し、次回リフレッシュを再スケジュール
    - リフレッシュ失敗（401）時にログアウト処理を実行しログイン画面にリダイレクト
    - ネットワークエラー時に 30 秒後にリトライ（最大 3 回）
    - アンマウント時にスケジュール済みタイマーをクリア
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 5.3 AuthProvider に login メソッドと logout メソッドを実装
    - login: ユーザー情報を state に設定し、StorageService にユーザー情報を保存、リフレッシュタイマーをスケジュール
    - logout: state をリセット、StorageService.clearAll、タイマークリア、/login にリダイレクト
    - AuthContextType に login、logout を公開
    - _要件: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 5.4 AuthProvider の認証状態復元のプロパティベーステストを作成
    - packages/web/src/lib/contexts/auth-context.property.test.tsx を作成
    - **Property 1: 認証状態復元の往復一貫性**
    - **検証: 要件 1.1, 1.2**

  - [ ]\* 5.5 AuthProvider のログアウト状態リセットのプロパティベーステストを作成
    - **Property 5: ログアウトによる認証状態リセット**
    - **検証: 要件 4.2**

  - [ ]\* 5.6 AuthProvider のリフレッシュスケジューリングのプロパティベーステストを作成
    - **Property 6: トークンリフレッシュのスケジューリングタイミング**
    - **検証: 要件 3.1**

  - [ ]\* 5.7 AuthProvider のユニットテストを拡張
    - packages/web/src/lib/contexts/auth-context.test.tsx を拡張
    - isLoading ライフサイクル（true → false 遷移）のテスト
    - リフレッシュ 401 時のログアウト実行テスト
    - リフレッシュ ネットワークエラー時の 30 秒リトライ × 3 回テスト
    - アンマウント時のタイマークリアテスト
    - ログアウト後の /login リダイレクトテスト
    - _要件: 1.4, 1.5, 3.5, 3.6, 3.7, 4.4_

- [ ] 6. チェックポイント - AuthProvider のテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

- [ ] 7. ProtectedRoute コンポーネントの実装
  - [ ] 7.1 ProtectedRoute コンポーネントを作成
    - packages/web/src/components/auth/protected-route.tsx を作成
    - useAuth フックから isAuthenticated、isLoading を取得
    - isLoading 中はローディング表示
    - 未認証時は /login?redirect={currentPath} にリダイレクト（useRouter、usePathname を使用）
    - 認証済み時は children を表示
    - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]\* 7.2 ProtectedRoute の未認証リダイレクトのプロパティベーステストを作成
    - packages/web/src/components/auth/protected-route.property.test.tsx を作成
    - **Property 8: ProtectedRoute の未認証ユーザーリダイレクト**
    - **検証: 要件 5.1, 5.2**

  - [ ]\* 7.3 ProtectedRoute の認証済み表示のプロパティベーステストを作成
    - **Property 9: ProtectedRoute の認証済みユーザー表示**
    - **検証: 要件 5.3**

  - [ ]\* 7.4 ProtectedRoute のユニットテストを作成
    - packages/web/src/components/auth/protected-route.test.tsx を作成
    - isLoading 中のローディング表示テスト
    - 未認証時のリダイレクトテスト（redirect パラメータ付き）
    - 認証済み時の children 表示テスト
    - _要件: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. AuthRedirect コンポーネントの実装
  - [ ] 8.1 AuthRedirect コンポーネントを作成
    - packages/web/src/components/auth/auth-redirect.tsx を作成
    - useAuth フックから isAuthenticated、isLoading を取得
    - isLoading 中はローディング表示
    - 認証済み時は / にリダイレクト
    - 未認証時は children を表示
    - _要件: 6.1, 6.2, 6.3_

  - [ ]\* 8.2 AuthRedirect の認証済みリダイレクトのプロパティベーステストを作成
    - packages/web/src/components/auth/auth-redirect.property.test.tsx を作成
    - **Property 10: AuthRedirect の認証済みユーザーリダイレクト**
    - **検証: 要件 6.1, 6.2**

  - [ ]\* 8.3 AuthRedirect のユニットテストを作成
    - packages/web/src/components/auth/auth-redirect.test.tsx を作成
    - isLoading 中のローディング表示テスト
    - 認証済み時の / リダイレクトテスト
    - 未認証時の children 表示テスト
    - _要件: 6.1, 6.2, 6.3_

- [ ] 9. チェックポイント - ProtectedRoute と AuthRedirect のテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

- [ ] 10. 既存フォームの拡張とリダイレクト対応
  - [ ] 10.1 useLogin フックにユーザー情報永続化とリダイレクト対応を追加
    - packages/web/src/lib/hooks/use-login.ts を拡張
    - ログイン成功時に AuthProvider の login メソッドを呼び出してユーザー情報を設定
    - ログイン成功時に StorageService にユーザー情報を保存
    - _要件: 2.1, 7.1, 7.2_

  - [ ] 10.2 useRegister フックにユーザー情報永続化を追加
    - packages/web/src/lib/hooks/use-register.ts を拡張
    - 登録成功時に AuthProvider の login メソッドを呼び出してユーザー情報を設定
    - 登録成功時に StorageService にユーザー情報を保存
    - _要件: 2.1, 7.3_

  - [ ] 10.3 LoginForm に redirect クエリパラメータ対応を追加
    - packages/web/src/components/auth/login-form.tsx を拡張
    - useSearchParams で redirect パラメータを取得
    - ログイン成功時に redirect パラメータがあればそのパスに、なければ / にリダイレクト
    - _要件: 7.1, 7.2_

  - [ ] 10.4 RegisterForm に登録成功後のリダイレクトを追加
    - packages/web/src/components/auth/register-form.tsx を拡張
    - 登録成功時に / にリダイレクト
    - _要件: 7.3_

  - [ ]\* 10.5 LoginForm の redirect パラメータのプロパティベーステストを作成
    - packages/web/src/components/auth/login-form.property.test.tsx を拡張
    - **Property 11: ログイン後の redirect パラメータによるリダイレクト**
    - **検証: 要件 7.1**

  - [ ]\* 10.6 既存フォームのユニットテストを拡張
    - packages/web/src/lib/hooks/use-login.test.tsx を拡張（ユーザー情報永続化テスト）
    - packages/web/src/lib/hooks/use-register.test.tsx を拡張（ユーザー情報永続化テスト）
    - packages/web/src/components/auth/login-form.test.tsx を拡張（redirect パラメータテスト）
    - 登録成功後の / リダイレクトテスト
    - _要件: 2.1, 7.1, 7.2, 7.3_

- [ ] 11. useAuth フックの型定義更新に追従
  - packages/web/src/lib/hooks/use-auth.ts を更新
  - 拡張された AuthContextType に追従
  - 既存テストの更新（packages/web/src/lib/hooks/use-auth.test.tsx）
  - _要件: 1.1, 1.2, 4.2_

- [ ] 12. 最終チェックポイント - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

## 注意事項

- `*` マークが付いたタスクはオプションであり、MVP では省略可能です
- 各タスクは前のタスクに基づいて構築されます
- プロパティベーステストは設計ドキュメントの Correctness Properties を参照します
- fast-check 設定: numRuns 10〜20、endOnFailure: true、fc.property のみ使用（fc.asyncProperty 禁止）
- チェックポイントで段階的な検証を行います
- すべてのコードは TypeScript で記述します
- Next.js 16 の App Router を使用します
- 既存コードの拡張を優先し、破壊的変更を最小限にします
