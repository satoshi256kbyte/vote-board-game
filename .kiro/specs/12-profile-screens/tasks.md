# 実装計画: プロフィール画面

## 概要

プロフィール表示画面（`/profile`）とプロフィール編集画面（`/profile/edit`）を実装します。ユーザーは自分のプロフィール情報（ユーザー名、アイコン画像）を表示・編集できます。既存のプロフィールAPI（spec 11-profile-api）と統合し、Next.js 16 App Router、shadcn/ui、Tailwind CSSを使用します。

## タスク

- [ ] 1. 型定義とサービス層の実装
  - [x] 1.1 プロフィール型定義を作成
    - `packages/web/src/lib/types/profile.ts`を作成
    - Profile、ProfileUpdateData、UploadUrlResponse型を定義
    - _要件: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_

  - [x] 1.2 プロフィールサービスを実装
    - `packages/web/src/lib/services/profile-service.ts`を作成
    - getProfile、updateProfile、getUploadUrlメソッドを実装
    - エラーハンドリング（401、400、500、ネットワークエラー）を実装
    - _要件: 1.1, 7.1, 8.1, 9.1, 9.2, 9.3, 9.4, 16.1, 16.2_

  - [x] 1.3 プロフィールサービスのユニットテストを作成
    - `packages/web/src/lib/services/profile-service.test.ts`を作成
    - getProfile、updateProfile、getUploadUrlの正常系・異常系をテスト
    - モックを使用してAPIレスポンスをシミュレート
    - _要件: 1.1, 7.1, 9.1, 9.2, 9.3, 9.4_

- [ ] 2. カスタムフックの実装
  - [x] 2.1 useProfileフックを実装
    - `packages/web/src/lib/hooks/use-profile.ts`を作成
    - プロフィール取得、ローディング状態、エラー状態、再取得機能を実装
    - _要件: 1.1, 3.1, 11.1, 11.3, 17.1, 17.2_

  - [x] 2.2 useProfileフックのユニットテストを作成
    - `packages/web/src/lib/hooks/use-profile.test.ts`を作成
    - renderHookを使用してフックの動作をテスト
    - ローディング状態、成功時、エラー時の挙動をテスト
    - _要件: 1.1, 11.1, 17.1_

  - [x] 2.3 useProfileUpdateフックを実装
    - `packages/web/src/lib/hooks/use-profile-update.ts`を作成
    - プロフィール更新、ローディング状態、エラー状態を実装
    - _要件: 7.1, 7.2, 7.3, 7.4, 8.1, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.4 useProfileUpdateフックのユニットテストを作成
    - `packages/web/src/lib/hooks/use-profile-update.test.ts`を作成
    - 更新成功時、バリデーションエラー時、サーバーエラー時の挙動をテスト
    - _要件: 7.1, 9.1, 9.2, 9.3_

  - [x] 2.5 useImageUploadフックを実装
    - `packages/web/src/lib/hooks/use-image-upload.ts`を作成
    - 画像アップロード、Presigned URL取得、S3アップロード、リトライ機能を実装
    - _要件: 6.1, 6.2, 6.3, 6.4, 16.3, 17.3, 17.4_

  - [x] 2.6 useImageUploadフックのユニットテストを作成
    - `packages/web/src/lib/hooks/use-image-upload.test.ts`を作成
    - アップロード成功時、失敗時、リトライ時の挙動をテスト
    - _要件: 6.1, 6.2, 6.3, 6.4, 17.3_

- [ ] 3. プロフィール表示画面の実装
  - [x] 3.1 ProfileViewコンポーネントを実装
    - `packages/web/src/components/profile/profile-view.tsx`を作成
    - useProfileフックを使用してプロフィール情報を取得
    - ユーザー名、メールアドレス、アイコン画像を表示
    - ローディング状態、エラー状態、再読み込みボタンを実装
    - Next.js Imageコンポーネントを使用して画像を最適化
    - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 11.1, 11.3, 15.1, 15.2, 15.3, 17.1, 17.2_

  - [x] 3.2 ProfileViewコンポーネントのユニットテストを作成
    - `packages/web/src/components/profile/profile-view.test.tsx`を作成
    - ローディング状態、プロフィール表示、エラー表示、再読み込みボタンをテスト
    - React Testing Libraryを使用
    - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 17.1_

  - [x] 3.3 プロフィール表示ページを作成
    - `packages/web/src/app/profile/page.tsx`を作成
    - ProtectedRouteでラップしてProfileViewコンポーネントを表示
    - _要件: 1.1, 12.1, 12.2_

- [ ] 4. プロフィール編集画面の実装
  - [x] 4.1 ProfileEditFormコンポーネントを実装（基本構造）
    - `packages/web/src/components/profile/profile-edit-form.tsx`を作成
    - useProfile、useProfileUpdate、useImageUploadフックを統合
    - フォーム状態管理（username、selectedFile、previewUrl、errors、hasChanges）を実装
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.2, 11.4_

  - [x] 4.2 ProfileEditFormコンポーネントにバリデーション機能を追加
    - ユーザー名の必須チェック、文字数制限（50文字）を実装
    - 画像ファイルのサイズチェック（5MB）、形式チェック（PNG、JPEG、GIF）を実装
    - エラーメッセージ表示を実装
    - _要件: 4.1, 4.2, 4.3, 5.1, 5.2, 5.4, 5.5_

  - [x] 4.3 ProfileEditFormコンポーネントに画像選択・プレビュー機能を追加
    - ファイル選択ダイアログ、画像プレビュー表示を実装
    - FileReaderを使用してプレビューURLを生成
    - _要件: 5.1, 5.2, 5.3, 15.4_

  - [x] 4.4 ProfileEditFormコンポーネントに保存・キャンセル機能を追加
    - 保存ボタンクリック時の処理（バリデーション、画像アップロード、プロフィール更新）を実装
    - キャンセルボタンクリック時の確認ダイアログを実装
    - 成功時のリダイレクト処理を実装
    - _要件: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 10.1, 10.2, 10.3, 10.4_

  - [x] 4.5 ProfileEditFormコンポーネントのユニットテストを作成
    - `packages/web/src/components/profile/profile-edit-form.test.tsx`を作成
    - バリデーション、画像選択、保存、キャンセルの動作をテスト
    - React Testing LibraryとfireEventを使用
    - _要件: 4.1, 4.2, 4.3, 5.1, 5.4, 5.5, 7.1, 10.1, 10.2_

  - [x] 4.6 プロフィール編集ページを作成
    - `packages/web/src/app/profile/edit/page.tsx`を作成
    - ProtectedRouteでラップしてProfileEditFormコンポーネントを表示
    - _要件: 2.1, 12.3, 12.4_

- [ ] 5. アクセシビリティとレスポンシブ対応
  - [~] 5.1 アクセシビリティ属性を追加
    - aria-label、aria-invalid、aria-describedby、role="alert"を適切に設定
    - alt属性を画像に追加
    - _要件: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [~] 5.2 レスポンシブデザインを実装
    - Tailwind CSSを使用してモバイル、タブレット、デスクトップに対応
    - 最小タップ領域44x44pxを確保
    - _要件: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [~] 5.3 アクセシビリティとレスポンシブのテストを作成
    - aria属性の存在確認、レスポンシブクラスの適用確認をテスト
    - _要件: 13.1, 13.2, 13.3, 13.4, 13.5, 14.3, 14.4_

- [ ] 6. 統合テストとプロパティベーステスト
  - [~] 6.1 プロフィール表示画面の統合テストを作成
    - `packages/web/src/app/profile/page.test.tsx`を作成
    - ページ全体の動作（認証チェック、プロフィール表示、編集画面遷移）をテスト
    - _要件: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 12.1, 12.2_

  - [~] 6.2 プロフィール編集画面の統合テストを作成
    - `packages/web/src/app/profile/edit/page.test.tsx`を作成
    - ページ全体の動作（認証チェック、フォーム表示、保存、キャンセル）をテスト
    - _要件: 3.1, 3.2, 7.1, 8.1, 8.2, 10.1, 12.3, 12.4_

  - [~] 6.3 ユーザー名バリデーションのプロパティベーステストを作成
    - fast-checkを使用してランダムな文字列でバリデーションをテスト
    - 空文字列、50文字超、有効な文字列のプロパティを検証
    - numRuns: 10-20、endOnFailure: trueを設定
    - _要件: 4.1, 4.2, 4.3_

  - [~] 6.4 画像ファイルバリデーションのプロパティベーステストを作成
    - fast-checkを使用してランダムなファイルサイズ・形式でバリデーションをテスト
    - 5MB超、サポート外形式、有効なファイルのプロパティを検証
    - numRuns: 10-20、endOnFailure: trueを設定
    - _要件: 5.4, 5.5_

- [~] 7. チェックポイント - すべてのテストが通過することを確認
  - すべてのテストが通過することを確認し、問題があればユーザーに質問してください。

## 注意事項

- `*`マークのタスクはオプションで、より速いMVPのためにスキップ可能です
- 各タスクは特定の要件を参照してトレーサビリティを確保しています
- プロパティベーステストではfast-checkを使用し、numRunsを10-20に制限してください
- asyncPropertyは使用せず、同期のfc.propertyを使用してください（JSDOM環境の安定性のため）
- Next.js 16 App Router、shadcn/ui、Tailwind CSSを使用してください
- 既存のProtectedRouteコンポーネントとstorageServiceを活用してください
