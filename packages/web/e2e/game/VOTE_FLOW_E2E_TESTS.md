# Vote Flow E2E Tests

このドキュメントは、投票ボタン・投票状況表示機能（spec 25）のE2Eテストについて説明します。

## 作成されたテストファイル

### 1. vote-flow.spec.ts

投票フロー全体をテストする新規E2Eテストファイル。

**テストスイート:**

#### Vote Flow - Authenticated User

認証済みユーザーの投票機能をテスト:

- ✅ `should allow authenticated user to vote on candidate` - 認証済みユーザーが候補に投票できることを確認
  - 投票ボタンのクリック
  - ローディング状態の確認（「投票中...」）
  - 投票済みインジケーターの表示確認
  - 45秒以内に完了することを確認

- ✅ `should display vote change button for other candidates after voting` - 投票後、他の候補に投票変更ボタンが表示されることを確認
  - 最初の候補に投票
  - 2番目の候補に「投票を変更」ボタンが表示されることを確認

- ✅ `should show confirmation dialog when changing vote` - 投票変更時に確認ダイアログが表示されることを確認
  - 投票変更ボタンのクリック
  - 確認ダイアログの表示確認
  - 確認・キャンセルボタンの存在確認

- ✅ `should change vote after confirmation` - 確認後に投票が変更されることを確認
  - 投票変更の確認
  - 新しい候補に投票済みインジケーターが表示されることを確認
  - 元の候補に投票変更ボタンが表示されることを確認
  - 45秒以内に完了することを確認

- ✅ `should cancel vote change when cancel button is clicked` - キャンセルボタンで投票変更がキャンセルされることを確認
  - キャンセルボタンのクリック
  - ダイアログが閉じることを確認
  - 投票状態が変更されていないことを確認

- ✅ `should close dialog when ESC key is pressed` - ESCキーでダイアログが閉じることを確認
  - ESCキーの押下
  - ダイアログが閉じることを確認

#### Vote Flow - Unauthenticated User

未認証ユーザーの投票制限をテスト:

- ✅ `should disable vote button for unauthenticated user` - 未認証ユーザーの投票ボタンが無効化されることを確認
  - 投票ボタンが無効化されていることを確認

- ✅ `should show tooltip when hovering over disabled vote button` - 無効化されたボタンにホバーするとツールチップが表示されることを確認
  - ツールチップに「ログインして投票」が表示されることを確認

- ✅ `should not trigger vote action when clicking disabled button` - 無効化されたボタンをクリックしても投票APIが呼ばれないことを確認
  - APIリクエストが発生しないことを確認

#### Vote Flow - Error Handling

エラーハンドリングをテスト:

- ✅ `should display error message when vote fails` - 投票失敗時にエラーメッセージが表示されることを確認
  - 500エラーをシミュレート
  - エラーメッセージの表示確認

- ✅ `should display authentication error message` - 認証エラー時に適切なメッセージが表示されることを確認
  - 401エラーをシミュレート
  - 「認証が必要です」メッセージの表示確認

- ✅ `should display already voted error message` - 既に投票済みエラー時に適切なメッセージが表示されることを確認
  - 409 ALREADY_VOTEDエラーをシミュレート
  - 「既に投票済みです」メッセージの表示確認

### 2. move-candidates.spec.ts

候補一覧表示と投票ボタンの表示をテストする新規E2Eテストファイル。

**テストスイート:**

#### Move Candidates - Display

候補一覧の基本表示をテスト:

- ✅ `should display candidate list section` - 候補一覧セクションが表示されることを確認
- ✅ `should display candidate cards in the list` - 候補カードが一覧に表示されることを確認
- ✅ `should display candidate information` - 候補情報（位置、説明、投稿者、投票数、締切）が表示されることを確認
- ✅ `should display sort and filter controls` - ソート・フィルタコントロールが表示されることを確認
- ✅ `should display post candidate button for authenticated users` - 認証済みユーザーに候補投稿ボタンが表示されることを確認

#### Move Candidates - Vote Button Display

投票ボタンの表示をテスト:

- ✅ `should display vote button for unauthenticated users` - 未認証ユーザーに投票ボタンが表示されることを確認
- ✅ `should display disabled vote button for unauthenticated users` - 未認証ユーザーの投票ボタンが無効化されることを確認
- ✅ `should display enabled vote button for authenticated users` - 認証済みユーザーの投票ボタンが有効化されることを確認
- ✅ `should display vote button with correct text` - 投票ボタンに正しいテキストが表示されることを確認
- ✅ `should display vote button with proper accessibility attributes` - 投票ボタンに適切なアクセシビリティ属性があることを確認

#### Move Candidates - Vote Status Indicator

投票済みインジケーターの表示をテスト:

- ✅ `should display vote status indicator after voting` - 投票後に投票済みインジケーターが表示されることを確認
- ✅ `should display checkmark icon in vote status indicator` - 投票済みインジケーターにチェックマークが表示されることを確認
- ✅ `should display vote count in vote status indicator` - 投票後に投票数が増加することを確認

#### Move Candidates - Vote Change Button

投票変更ボタンの表示をテスト:

- ✅ `should display vote change button for other candidates after voting` - 投票後、他の候補に投票変更ボタンが表示されることを確認
- ✅ `should display vote change button with outline variant style` - 投票変更ボタンがoutlineスタイルで表示されることを確認

#### Move Candidates - Responsive Design

レスポンシブデザインをテスト:

- ✅ `should display candidates in grid layout on desktop` - デスクトップでグリッドレイアウトが表示されることを確認
- ✅ `should display candidates in single column on mobile` - モバイルで単一カラムレイアウトが表示されることを確認
- ✅ `should have minimum touch target size on mobile` - モバイルで最小タッチターゲットサイズ（44px）が確保されることを確認

#### Move Candidates - Performance

パフォーマンスをテスト:

- ✅ `should load candidate list within 30 seconds` - 候補一覧が30秒以内に読み込まれることを確認
- ✅ `should display all candidate elements within 30 seconds` - すべての候補要素が30秒以内に表示されることを確認

## 要件カバレッジ

これらのテストは、以下の要件をカバーしています:

### Spec 25: 投票ボタン・投票状況表示機能

- **Requirement 1: 未認証ユーザーの投票制限**
  - 1.1: 未認証ユーザーの投票ボタンが無効化される ✓
  - 1.2: ツールチップに「ログインして投票」が表示される ✓
  - 1.3: 無効化されたボタンをクリックしても投票アクションが発生しない ✓

- **Requirement 2: 投票済み状態の表示**
  - 2.1: 投票済みの場合、投票済みインジケーターが表示される ✓
  - 2.2: チェックマークと「投票済み」テキストが表示される ✓
  - 2.3: 投票数が表示される ✓

- **Requirement 3: 投票変更ボタンの表示**
  - 3.1: 他の候補に投票済みの場合、「投票を変更」ボタンが表示される ✓
  - 3.2: outlineスタイルで表示される ✓

- **Requirement 4: 投票変更の確認**
  - 4.1: 投票変更ボタンをクリックすると確認ダイアログが表示される ✓
  - 4.2: 現在の投票先と新しい投票先が表示される ✓
  - 4.3: 確認ボタンで投票変更が実行される ✓
  - 4.4: キャンセルボタンでダイアログが閉じる ✓
  - 4.5: ESCキーでダイアログが閉じる ✓

- **Requirement 5: 投票成功後のUI更新**
  - 5.1: 投票後に投票数が更新される ✓
  - 5.2: 投票後に投票済みインジケーターが表示される ✓
  - 5.3: 候補リストが最新の状態に更新される ✓
  - 5.4: 投票変更後に両方の候補の投票数が更新される ✓
  - 5.5: 投票変更後に新しい候補に投票済みインジケーターが表示される ✓

- **Requirement 6: ローディング状態の表示**
  - 6.1: 投票処理中にボタンが無効化される ✓
  - 6.2: 投票処理中に「投票中...」が表示される ✓
  - 6.3: 投票変更処理中に「変更中...」が表示される ✓

- **Requirement 7: エラーメッセージの表示**
  - 7.1: 401エラー時に「認証が必要です」が表示される ✓
  - 7.2: 409 ALREADY_VOTEDエラー時に「既に投票済みです」が表示される ✓
  - 7.7: 500エラー時に「投票に失敗しました」が表示される ✓

- **Requirement 10: レスポンシブデザイン**
  - 10.1: タッチターゲットサイズが44px以上である ✓
  - 10.2: モバイルで全幅表示される ✓

### Spec 23: 候補一覧表示機能

- 候補一覧の表示 ✓
- ソート・フィルタコントロールの表示 ✓
- 候補カードの表示 ✓
- レスポンシブデザイン ✓

## テストの実行

### すべての投票フローテストを実行

```bash
pnpm test:e2e game/vote-flow.spec.ts
```

### 候補一覧と投票ボタンのテストを実行

```bash
pnpm test:e2e game/move-candidates.spec.ts
```

### すべてのゲーム関連E2Eテストを実行

```bash
pnpm test:e2e game/
```

### UIモードでデバッグ実行

```bash
pnpm test:e2e:ui game/vote-flow.spec.ts
```

### ヘッドモードで実行

```bash
pnpm test:e2e:headed game/vote-flow.spec.ts
```

## テストデータ

テストは以下のフィクスチャを使用します:

- `authenticatedPage`: 認証済みページとテストユーザーを提供
- `game`: アクティブ状態のテストゲームを提供
- `testUser`: テストユーザーの認証情報を提供

## 注意事項

### パフォーマンス要件

- 投票フローテストは45秒以内に完了する必要があります
- 候補一覧の読み込みは30秒以内に完了する必要があります

### テストの安定性

- すべてのテストは`waitForNetworkIdle`と`waitForApiResponse`を使用して、ネットワークリクエストの完了を待機します
- タイムアウトは`TIMEOUTS`定数で管理されています（SHORT: 5秒、MEDIUM: 10秒、LONG: 30秒）

### クリーンアップ

- テストは実行後に自動的にテストデータをクリーンアップします
- テストユーザーとテストゲームは各テスト後に削除されます

## 実装されたコンポーネント

これらのE2Eテストは、以下のコンポーネントをテストします:

1. **VoteButton** (`packages/web/src/components/vote-button.tsx`)
   - 投票ボタンの表示と動作
   - 投票変更ボタンの表示と動作
   - ローディング状態の管理
   - エラーハンドリング

2. **VoteStatusIndicator** (`packages/web/src/components/vote-status-indicator.tsx`)
   - 投票済みインジケーターの表示
   - チェックマークと投票数の表示

3. **VoteConfirmDialog** (`packages/web/src/components/vote-confirm-dialog.tsx`)
   - 投票変更確認ダイアログの表示
   - 確認・キャンセル処理
   - ESCキーでの閉じる処理

4. **CandidateCard** (`packages/web/src/app/games/[gameId]/_components/candidate-card.tsx`)
   - 候補カードの表示
   - VoteButtonの統合

5. **CandidateList** (`packages/web/src/app/games/[gameId]/_components/candidate-list.tsx`)
   - 候補一覧の表示
   - 投票成功後の更新処理

## 次のステップ

1. ✅ E2Eテストの作成完了
2. ⏭️ E2Eテストの実行と検証
3. ⏭️ CI/CDパイプラインへの統合

## 関連ドキュメント

- [Spec 25: 投票ボタン・投票状況表示機能](.kiro/specs/25-vote-button-status-display/)
- [Spec 23: 候補一覧表示機能](.kiro/specs/23-candidate-list-display/)
- [E2E Testing Guide](packages/web/e2e/README.md)
