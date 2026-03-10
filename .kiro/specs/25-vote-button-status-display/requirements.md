# Requirements Document: 投票ボタン・投票状況表示機能

## Introduction

投票ボタン・投票状況表示機能は、投票対局アプリケーションにおいて、ユーザーが次の一手候補に対して投票し、現在の投票状況を視覚的に確認できる機能です。この機能は、認証済みユーザーに投票・投票変更・投票状況の確認機能を提供し、未認証ユーザーには投票ボタンを無効化します。

この機能は、既存の候補一覧表示機能（spec 23）を拡張し、投票API（spec 20）、投票変更API（spec 21）、投票状況取得API（spec 22）と統合されます。

## Glossary

- **VoteButton**: 投票ボタンコンポーネント。ユーザーが候補に投票するためのUIコンポーネント
- **VoteStatusIndicator**: 投票状況インジケーターコンポーネント。投票済みマークと投票数を表示するUIコンポーネント
- **VoteConfirmDialog**: 投票変更確認ダイアログコンポーネント。投票変更時に確認を求めるUIコンポーネント
- **Candidate**: 次の一手候補。ユーザーが投票できる選択肢
- **Turn**: ターン。対局の1手を表す単位
- **Game**: 対局。オセロの1ゲーム
- **Authenticated_User**: 認証済みユーザー。ログイン済みのユーザー
- **Unauthenticated_User**: 未認証ユーザー。ログインしていないユーザー

## Requirements

### Requirement 1: 未認証ユーザーの投票制限

**User Story:** As an unauthenticated user, I want to see disabled vote buttons with a tooltip, so that I understand I need to log in to vote.

#### Acceptance Criteria

1. WHEN an Unauthenticated_User views a Candidate, THE VoteButton SHALL be disabled
2. WHEN an Unauthenticated_User hovers over a disabled VoteButton, THE System SHALL display a tooltip with the text "ログインして投票"
3. WHEN an Unauthenticated_User clicks a disabled VoteButton, THE System SHALL not trigger any vote action

### Requirement 2: 投票済み状態の表示

**User Story:** As an authenticated user, I want to see a visual indicator when I have voted for a candidate, so that I can confirm my vote was recorded.

#### Acceptance Criteria

1. WHEN an Authenticated_User has voted for a Candidate, THE VoteStatusIndicator SHALL be displayed instead of the VoteButton
2. WHEN the VoteStatusIndicator is displayed, THE System SHALL show a checkmark icon and the text "投票済み"
3. WHEN the VoteStatusIndicator is displayed, THE System SHALL show the current vote count for that Candidate

### Requirement 3: 投票変更ボタンの表示

**User Story:** As an authenticated user who has already voted, I want to see a "change vote" button on other candidates, so that I can change my vote if I change my mind.

#### Acceptance Criteria

1. WHEN an Authenticated_User has voted for a different Candidate, THE VoteButton SHALL display as a "投票を変更" button
2. WHEN the "投票を変更" button is displayed, THE System SHALL use an outline variant style to distinguish it from the primary vote button
3. WHEN an Authenticated_User clicks the "投票を変更" button, THE System SHALL display a confirmation dialog before processing the vote change

### Requirement 4: 投票変更の確認

**User Story:** As an authenticated user, I want to confirm my vote change before it is processed, so that I don't accidentally change my vote.

#### Acceptance Criteria

1. WHEN an Authenticated_User clicks the "投票を変更" button, THE VoteConfirmDialog SHALL be displayed
2. WHEN the VoteConfirmDialog is displayed, THE System SHALL show the current vote position and the new vote position
3. WHEN an Authenticated_User clicks the confirm button in the VoteConfirmDialog, THE System SHALL process the vote change
4. WHEN an Authenticated_User clicks the cancel button in the VoteConfirmDialog, THE System SHALL close the dialog without processing the vote change
5. WHEN an Authenticated_User presses the ESC key while the VoteConfirmDialog is open, THE System SHALL close the dialog without processing the vote change

### Requirement 5: 投票成功後のUI更新

**User Story:** As an authenticated user, I want to see immediate feedback after voting, so that I know my vote was successful.

#### Acceptance Criteria

1. WHEN a vote is successfully created, THE System SHALL update the vote count for the Candidate
2. WHEN a vote is successfully created, THE System SHALL display the VoteStatusIndicator for the voted Candidate
3. WHEN a vote is successfully created, THE System SHALL refresh the candidate list to show the latest vote status
4. WHEN a vote is successfully changed, THE System SHALL update the vote count for both the old and new Candidates
5. WHEN a vote is successfully changed, THE System SHALL display the VoteStatusIndicator for the new Candidate

### Requirement 6: ローディング状態の表示

**User Story:** As an authenticated user, I want to see a loading indicator while my vote is being processed, so that I know the system is working.

#### Acceptance Criteria

1. WHEN a vote is being processed, THE VoteButton SHALL be disabled
2. WHEN a vote is being processed, THE VoteButton SHALL display "投票中..." text
3. WHEN a vote change is being processed, THE VoteButton SHALL display "変更中..." text
4. WHEN a vote is being processed, THE System SHALL prevent duplicate submissions

### Requirement 7: エラーメッセージの表示

**User Story:** As an authenticated user, I want to see clear error messages when voting fails, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. IF a vote fails with a 401 authentication error, THEN THE System SHALL display the message "認証が必要です。ログインしてください。"
2. IF a vote fails with a 409 ALREADY_VOTED error, THEN THE System SHALL display the message "既に投票済みです"
3. IF a vote fails with a 400 VOTING_CLOSED error, THEN THE System SHALL display the message "投票期間が終了しています"
4. IF a vote change fails with a 409 NOT_VOTED error, THEN THE System SHALL display the message "まだ投票していません"
5. IF a vote change fails with a 400 SAME_CANDIDATE error, THEN THE System SHALL display the message "既にこの候補に投票しています"
6. IF a vote fails with a network error, THEN THE System SHALL display the message "ネットワークエラーが発生しました"
7. IF a vote fails with a 500 server error, THEN THE System SHALL display the message "投票に失敗しました。もう一度お試しください。"

### Requirement 8: 投票数の表示

**User Story:** As a user, I want to see the current vote count for each candidate, so that I can see which candidates are popular.

#### Acceptance Criteria

1. WHEN a Candidate is displayed, THE System SHALL show the current vote count
2. WHEN a vote is successfully created or changed, THE System SHALL immediately update the displayed vote count

### Requirement 9: アクセシビリティ対応

**User Story:** As a user with accessibility needs, I want to interact with vote buttons using keyboard and screen readers, so that I can participate in voting.

#### Acceptance Criteria

1. WHEN a VoteButton receives focus, THE System SHALL display a visible focus indicator
2. WHEN an Authenticated_User presses Enter or Space on a focused VoteButton, THE System SHALL trigger the vote action
3. WHEN a VoteButton is rendered, THE System SHALL provide appropriate aria-label and role attributes for screen readers
4. WHEN the VoteConfirmDialog is displayed, THE System SHALL trap focus within the dialog
5. WHEN the VoteConfirmDialog is displayed, THE System SHALL set focus to the confirm button

### Requirement 10: レスポンシブデザイン

**User Story:** As a mobile user, I want vote buttons to be easy to tap on my device, so that I can vote comfortably.

#### Acceptance Criteria

1. WHEN a VoteButton is displayed on any screen size, THE System SHALL ensure the touch target size is at least 44px by 44px
2. WHEN VoteButtons are displayed on mobile devices (screen width less than 640px), THE System SHALL display them at full width
3. WHEN VoteButtons are displayed on tablet devices (screen width 640px to 767px), THE System SHALL display them at an appropriate size
4. WHEN VoteButtons are displayed on desktop devices (screen width 768px or greater), THE System SHALL display them at an appropriate size

### Requirement 11: 投票API統合

**User Story:** As a developer, I want the vote button to integrate with existing vote APIs, so that votes are properly recorded in the backend.

#### Acceptance Criteria

1. WHEN an Authenticated_User clicks the vote button, THE System SHALL call POST /games/:gameId/turns/:turnNumber/votes with the candidateId
2. WHEN an Authenticated_User confirms a vote change, THE System SHALL call PUT /games/:gameId/turns/:turnNumber/votes/me with the new candidateId
3. WHEN a vote API call succeeds, THE System SHALL invoke the onVoteSuccess callback
4. WHEN a vote API call fails, THE System SHALL display an appropriate error message based on the error status code

### Requirement 12: 楽観的UI更新

**User Story:** As a user, I want to see immediate feedback when I vote, so that the interface feels responsive.

#### Acceptance Criteria

1. WHEN an Authenticated_User clicks the vote button, THE System SHALL immediately update the UI to show the voted state before the API response is received
2. IF the vote API call fails, THEN THE System SHALL rollback the UI to the previous state
3. WHEN a vote is rolled back, THE System SHALL display an error message to the user

### Requirement 13: 二重送信の防止

**User Story:** As a developer, I want to prevent duplicate vote submissions, so that users cannot accidentally vote multiple times.

#### Acceptance Criteria

1. WHEN a vote is being processed, THE VoteButton SHALL be disabled
2. WHEN a vote is being processed, THE System SHALL ignore additional click events on the VoteButton
3. WHEN a vote API call completes (success or failure), THE VoteButton SHALL be re-enabled
