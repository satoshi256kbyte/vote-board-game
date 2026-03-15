# タスク: AI コンテンツ表示

## タスク 1: 解説取得 API エンドポイント（バックエンド）

- [x] 1.1 `packages/api/src/routes/commentary.ts` に `GET /games/:gameId/commentary` エンドポイントを実装する
  - CommentaryRepository.listByGame() を使用して解説を取得
  - GameRepository で対局の存在確認（存在しない場合は 404）
  - turnNumber 昇順でソート
  - 解説なし時は空の commentaries 配列を返す
  - 認証不要（公開エンドポイント）
- [x] 1.2 `packages/api/src/index.ts` に commentary ルートを登録する
- [x] 1.3 `packages/api/src/routes/commentary.test.ts` にユニットテストを実装する
  - 正常レスポンス、404、空配列、ソート順の検証
- [x] 1.4 `packages/api/src/routes/commentary.property.test.ts` にプロパティベーステストを実装する
  - Property 8: turnNumber 昇順ソート
  - Property 9: 必須フィールドの存在

## タスク 2: AI 候補バッジコンポーネント

- [x] 2.1 `packages/web/src/app/games/[gameId]/_components/ai-candidate-badge.tsx` を作成する
  - "AI生成" テキスト、紫色スタイリング（bg-purple-100, text-purple-800）
  - aria-label="AI が生成した候補"
- [x] 2.2 `packages/web/src/app/games/[gameId]/_components/candidate-card.tsx` を拡張し、source === 'ai' の場合に AICandidateBadge を表示する
- [x] 2.3 `packages/web/src/app/games/[gameId]/_components/ai-candidate-badge.test.tsx` にユニットテストを実装する
- [x] 2.4 `packages/web/src/app/games/[gameId]/_components/candidate-card.property.test.tsx` を更新し、AI バッジ関連のプロパティテストを追加する
  - Property 1: AI バッジ表示は source フィールドと一致する
  - Property 2: 投稿者名表示は source に基づいて正しくマッピングされる

## タスク 3: 解説 API クライアント（フロントエンド）

- [x] 3.1 `packages/web/src/lib/api/commentary.ts` に Commentary 型と getCommentaries() 関数を実装する
  - 既存の getApiBaseUrl / handleResponse パターンを再利用
  - 404 時は空配列を返す
  - その他のエラーは ApiError をスロー
- [x] 3.2 `packages/web/src/lib/api/index.ts` に getCommentaries をエクスポートに追加する
- [x] 3.3 `packages/web/src/lib/api/commentary.test.ts` にユニットテストを実装する
  - 正常取得、404 時の空配列、エラー時の ApiError スロー
- [x] 3.4 `packages/web/src/lib/api/commentary.property.test.ts` にプロパティベーステストを実装する
  - Property 3: 解説 API レスポンスのマッピングはすべてのフィールドを保持する

## タスク 4: 対局解説セクションコンポーネント

- [x] 4.1 `packages/web/src/app/games/[gameId]/_components/commentary-section.tsx` を作成する
  - 青色系スタイリング（bg-blue-50, border-blue-200, leading-relaxed）
  - ローディング時のスケルトンローダー
  - エラー時のエラーメッセージ（role="alert"）
  - 解説なし時の空メッセージ
  - セマンティック HTML（section, article, h2）
  - ターン選択 UI（前のターン / 次のターン ボタン）
  - デフォルトで最新ターンの解説を表示
  - ターン選択ボタンの境界条件（最初/最後のターンでの無効化、aria-disabled）
- [x] 4.2 `packages/web/src/app/games/[gameId]/_components/commentary-section.test.tsx` にユニットテストを実装する
- [x] 4.3 `packages/web/src/app/games/[gameId]/_components/commentary-section.property.test.tsx` にプロパティベーステストを実装する
  - Property 4: 選択されたターンの解説が正しく表示される
  - Property 5: ターンナビゲーションは正しく解説を切り替える
  - Property 6: 複数ターンの解説がある場合にターン選択 UI が表示される
  - Property 7: デフォルトで最新ターンの解説が表示される

## タスク 5: 対局詳細画面への統合

- [x] 5.1 `packages/web/src/app/games/[gameId]/page.tsx` を更新する
  - 解説データの state 追加（commentaries, commentariesLoading, commentariesError）
  - ゲームデータ取得後に getCommentaries() を候補取得と並行で呼び出し
  - 既存の AI 解説プレースホルダーを CommentarySection コンポーネントに置き換え
- [x] 5.2 `packages/web/src/app/games/[gameId]/page.test.tsx` を更新し、解説統合のテストを追加する
  - Property 10: 解説取得失敗は候補一覧の表示をブロックしない
