# Requirements Document

## Introduction

投票ボードゲーム（Vote Board Game）のフロントエンド認証状態管理機能の要件定義。
Next.js 16 App Router 上で、Amazon Cognito + JWT トークンベースの認証状態をクライアントサイドで管理する。
既存の AuthContext / AuthProvider / useAuth フック / AuthService / StorageService を拡張・改善し、トークンライフサイクル管理、自動リフレッシュ、アクセス制御、ログアウトを統合的に提供する。

## Glossary

- **AuthProvider**: React Context Provider。認証状態（ユーザー情報、認証済み判定）をコンポーネントツリー全体に提供する Client Component
- **AuthContext**: AuthProvider が提供する React Context オブジェクト
- **useAuth**: AuthContext から認証状態を取得するカスタムフック
- **AuthService**: バックエンド認証 API（ログイン、登録、トークンリフレッシュ、パスワードリセット）との通信を担当するサービスクラス
- **StorageService**: localStorage を介して JWT トークン（アクセストークン、リフレッシュトークン）およびユーザー情報を永続化するサービスクラス
- **AccessToken**: Cognito が発行する JWT アクセストークン。有効期限 900 秒（15 分）。API リクエストの認証に使用
- **RefreshToken**: Cognito が発行するリフレッシュトークン。AccessToken の再取得に使用
- **ProtectedRoute**: 認証が必要なページへのアクセスを制御するコンポーネント。未認証ユーザーをログイン画面にリダイレクトする
- **TokenRefresh**: AccessToken の有効期限切れ前に RefreshToken を使用して新しい AccessToken を自動取得する処理

## Requirements

### Requirement 1: 認証状態の初期化と復元

**User Story:** As a ユーザー, I want ブラウザをリロードしても認証状態が維持されること, so that 再ログインの手間なくアプリケーションを継続利用できる

#### Acceptance Criteria

1. WHEN AuthProvider がマウントされた時, THE AuthProvider SHALL localStorage から AccessToken とユーザー情報（userId, email, username）を読み込み、認証状態を復元する
2. WHEN localStorage に有効な AccessToken とユーザー情報が存在する時, THE AuthProvider SHALL isAuthenticated を true に設定し、user オブジェクトにユーザー情報を格納する
3. WHEN localStorage に AccessToken が存在しない時, THE AuthProvider SHALL isAuthenticated を false に設定し、user を null に設定する
4. WHILE AuthProvider が認証状態を初期化している間, THE AuthProvider SHALL isLoading を true に設定する
5. WHEN 認証状態の初期化が完了した時, THE AuthProvider SHALL isLoading を false に設定する

### Requirement 2: ユーザー情報の永続化

**User Story:** As a ユーザー, I want ログインや登録で取得したユーザー情報がブラウザに保存されること, so that ページリロード後も認証状態が維持される

#### Acceptance Criteria

1. WHEN ログインまたは登録が成功した時, THE StorageService SHALL ユーザー情報（userId, email, username）を localStorage に保存する
2. WHEN ログアウトが実行された時, THE StorageService SHALL localStorage からユーザー情報を削除する
3. THE StorageService SHALL ユーザー情報を JSON 文字列として単一のキー（vbg_user）で保存する
4. IF localStorage から読み込んだユーザー情報の JSON パースに失敗した場合, THEN THE StorageService SHALL null を返し、保存されていた不正なデータを削除する

### Requirement 3: トークン自動リフレッシュ

**User Story:** As a ユーザー, I want AccessToken の有効期限が切れる前に自動的に新しいトークンが取得されること, so that 操作中にセッションが切れない

#### Acceptance Criteria

1. WHEN AuthProvider がマウントされ認証済み状態である時, THE AuthProvider SHALL AccessToken の有効期限の 60 秒前にリフレッシュ処理をスケジュールする
2. WHEN リフレッシュのスケジュール時刻に達した時, THE AuthService SHALL RefreshToken を使用して POST /auth/refresh API を呼び出し、新しい AccessToken を取得する
3. WHEN トークンリフレッシュが成功した時, THE StorageService SHALL 新しい AccessToken を localStorage に保存する
4. WHEN トークンリフレッシュが成功した時, THE AuthProvider SHALL 次回のリフレッシュ処理を再スケジュールする
5. IF トークンリフレッシュが失敗した場合（401 レスポンス）, THEN THE AuthProvider SHALL ログアウト処理を実行し、ユーザーをログイン画面にリダイレクトする
6. IF トークンリフレッシュがネットワークエラーで失敗した場合, THEN THE AuthProvider SHALL 30 秒後にリフレッシュを再試行する（最大 3 回）
7. WHEN AuthProvider がアンマウントされた時, THE AuthProvider SHALL スケジュール済みのリフレッシュタイマーをクリアする

### Requirement 4: ログアウト

**User Story:** As a ユーザー, I want ログアウトボタンを押してセッションを終了できること, so that 共有端末で安全にアプリケーションを利用できる

#### Acceptance Criteria

1. WHEN ログアウトが実行された時, THE AuthService SHALL localStorage から AccessToken、RefreshToken、ユーザー情報を削除する
2. WHEN ログアウトが実行された時, THE AuthProvider SHALL user を null に設定し、isAuthenticated を false に設定する
3. WHEN ログアウトが実行された時, THE AuthProvider SHALL スケジュール済みのトークンリフレッシュタイマーをクリアする
4. WHEN ログアウトが実行された時, THE AuthProvider SHALL ユーザーをログイン画面（/login）にリダイレクトする

### Requirement 5: 認証が必要なページのアクセス制御

**User Story:** As a 開発者, I want 認証が必要なページに未認証ユーザーがアクセスした場合に自動的にログイン画面にリダイレクトされること, so that 認証制御を各ページで個別に実装する必要がない

#### Acceptance Criteria

1. WHEN 未認証ユーザーが ProtectedRoute で保護されたページにアクセスした時, THE ProtectedRoute SHALL ユーザーをログイン画面（/login）にリダイレクトする
2. WHEN 未認証ユーザーがリダイレクトされる時, THE ProtectedRoute SHALL リダイレクト先 URL にクエリパラメータ redirect を付与し、元のページパスを保持する（例: /login?redirect=/profile）
3. WHEN 認証済みユーザーが ProtectedRoute で保護されたページにアクセスした時, THE ProtectedRoute SHALL 子コンポーネントを表示する
4. WHILE AuthProvider が認証状態を初期化している間（isLoading が true）, THE ProtectedRoute SHALL ローディング表示を行う
5. THE ProtectedRoute SHALL /profile、/games/new、/games/[gameId]/candidates/new のページに適用可能である

### Requirement 6: 認証済みユーザーの認証画面リダイレクト

**User Story:** As a ユーザー, I want ログイン済みの状態でログイン画面や登録画面にアクセスした場合にトップページにリダイレクトされること, so that 不要な認証操作を避けられる

#### Acceptance Criteria

1. WHEN 認証済みユーザーがログイン画面（/login）にアクセスした時, THE AuthRedirect SHALL ユーザーをトップページ（/）にリダイレクトする
2. WHEN 認証済みユーザーが登録画面（/register）にアクセスした時, THE AuthRedirect SHALL ユーザーをトップページ（/）にリダイレクトする
3. WHILE AuthProvider が認証状態を初期化している間（isLoading が true）, THE AuthRedirect SHALL ローディング表示を行う

### Requirement 7: ログイン成功後のリダイレクト

**User Story:** As a ユーザー, I want ログイン後に元々アクセスしようとしていたページに戻れること, so that 操作の流れが中断されない

#### Acceptance Criteria

1. WHEN ログインが成功し、URL に redirect クエリパラメータが存在する時, THE LoginForm SHALL redirect パラメータで指定されたパスにリダイレクトする
2. WHEN ログインが成功し、URL に redirect クエリパラメータが存在しない時, THE LoginForm SHALL トップページ（/）にリダイレクトする
3. WHEN 登録が成功した時, THE RegisterForm SHALL トップページ（/）にリダイレクトする

### Requirement 8: 認証付き API リクエスト

**User Story:** As a 開発者, I want 認証が必要な API リクエストに自動的に AccessToken を付与できること, so that 各 API 呼び出しで個別にトークン管理をする必要がない

#### Acceptance Criteria

1. THE AuthService SHALL 認証が必要な API リクエストの Authorization ヘッダーに Bearer トークン形式で AccessToken を付与するメソッドを提供する
2. WHEN AccessToken が存在しない状態で認証付き API リクエストが呼び出された時, THE AuthService SHALL エラーを返す
3. IF API リクエストが 401 レスポンスを返した場合, THEN THE AuthService SHALL トークンリフレッシュを試行し、成功した場合は元のリクエストを再実行する
4. IF トークンリフレッシュ後の再実行でも 401 レスポンスが返された場合, THEN THE AuthService SHALL ログアウト処理を実行する
