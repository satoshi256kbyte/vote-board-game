# Bugfix Requirements Document

## Introduction

GitHub Actions上で実行されるE2Eテスト（Playwright）が、ゲーム作成後のリダイレクトに失敗し、24個のテストがタイムアウトエラーで失敗しています。ローカル環境では正常に動作しますが、CI環境では `page.content: Target page, context or browser has been closed` エラーが発生します。

根本原因は、ゲーム作成API呼び出しが失敗または予期しないレスポンスを返すことで、`/games/{gameId}` へのリダイレクトが実行されず、`/games/new` ページに留まり続けることです。その結果、テストが期待するゲーム詳細ページの要素を見つけられず、タイムアウトします。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN GitHub Actions CI環境でゲーム作成フォームを送信する THEN システムは `/games/new` ページに留まり、ゲーム詳細ページへリダイレクトされない

1.2 WHEN ゲーム作成APIが失敗またはエラーレスポンスを返す THEN システムはエラーハンドリングが不十分で、ユーザーに適切なエラーメッセージを表示せず、リダイレクトも実行されない

1.3 WHEN E2Eテストがゲーム詳細ページの要素（h1タグ、盤面など）を待機する THEN システムは30秒のタイムアウト後に "Target page, context or browser has been closed" エラーで失敗する

1.4 WHEN API呼び出しがネットワークエラーまたはCORSエラーで失敗する THEN システムはコンソールにエラーログを出力するが、ユーザーインターフェースには反映されず、リダイレクトも実行されない

### Expected Behavior (Correct)

2.1 WHEN GitHub Actions CI環境でゲーム作成フォームを送信する THEN システムは正常にゲームを作成し、`/games/{gameId}` ページへリダイレクトする

2.2 WHEN ゲーム作成APIが失敗またはエラーレスポンスを返す THEN システムは適切なエラーメッセージをユーザーに表示し、フォームの送信状態をリセットする

2.3 WHEN E2Eテストがゲーム詳細ページの要素を待機する THEN システムは正常にリダイレクトされたゲーム詳細ページで要素を見つけ、テストが成功する

2.4 WHEN API呼び出しがネットワークエラーまたはCORSエラーで失敗する THEN システムは詳細なエラー情報をログに記録し、ユーザーに分かりやすいエラーメッセージを表示する

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ローカル開発環境でゲーム作成フォームを送信する THEN システムは引き続き正常にゲームを作成し、ゲーム詳細ページへリダイレクトする

3.2 WHEN ゲーム作成が成功し、有効なgameIdを含むレスポンスを受け取る THEN システムは引き続き `/games/{gameId}` へ正しくリダイレクトする

3.3 WHEN ユーザーが認証されていない状態でゲーム作成ページにアクセスする THEN システムは引き続きログインページへリダイレクトする

3.4 WHEN APIクライアントが正常なレスポンスを受け取る THEN システムは引き続き適切にレスポンスをパースし、型安全な方法でデータを返す
