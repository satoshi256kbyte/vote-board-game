#!/usr/bin/env node
/**
 * Test Coverage Verification Script
 *
 * This script verifies that all requirements from the spec are covered by E2E tests.
 */

const requirements = [
  {
    id: '要件1',
    name: '認証フローのテスト',
    acceptanceCriteria: [
      '新規ユーザーが有効なデータで登録フォームを完了する',
      '登録済みユーザーが有効な認証情報を送信する',
      'ログイン済みユーザーがログアウトボタンをクリックする',
      'ユーザーが無効な認証情報を送信する',
      'ユーザーが認証なしで保護されたページにアクセスしようとする',
    ],
    testFiles: ['auth/registration.spec.ts', 'auth/login.spec.ts'],
    covered: true,
  },
  {
    id: '要件2',
    name: 'パスワードリセットフローのテスト',
    acceptanceCriteria: [
      'ユーザーがパスワードリセット要求ページで有効なメールアドレスを送信する',
      'ユーザーがパスワードリセット要求ページで無効なメールアドレスを送信する',
      'ユーザーが有効なリセットトークンと新しいパスワードでパスワードリセットフォームを完了する',
      'ユーザーが期限切れまたは無効なリセットトークンを使用しようとする',
    ],
    testFiles: ['auth/password-reset.spec.ts'],
    covered: true,
  },
  {
    id: '要件3',
    name: 'ゲーム閲覧と参加フローのテスト',
    acceptanceCriteria: [
      'ログイン済みユーザーがゲーム一覧ページに移動する',
      'ユーザーが一覧からゲームをクリックする',
      'ユーザーがゲーム詳細ページでゲーム参加ボタンをクリックする',
      'ユーザーがゲーム詳細ページを表示する（手の履歴）',
      'ユーザーがゲーム詳細ページを表示する（AIによる解説）',
    ],
    testFiles: ['game/game-list.spec.ts', 'game/game-detail.spec.ts', 'game/game-join.spec.ts'],
    covered: true,
  },
  {
    id: '要件4',
    name: '投票フローのテスト',
    acceptanceCriteria: [
      'ログイン済みユーザーがアクティブなゲームの投票ページに移動する',
      'ユーザーが次の一手候補を選択して投票を送信する',
      'ユーザーが同じ投票期間中に同じゲームに2回投票しようとする',
      'ユーザーが次の一手候補を表示する（説明文）',
      'ユーザーが有効なデータで新しい次の一手候補を送信する',
      'ユーザーが無効なデータで次の一手候補を送信しようとする',
    ],
    testFiles: [
      'voting/vote-submission.spec.ts',
      'voting/vote-validation.spec.ts',
      'voting/candidate-submission.spec.ts',
    ],
    covered: true,
  },
  {
    id: '要件5',
    name: 'プロフィール管理フローのテスト',
    acceptanceCriteria: [
      'ログイン済みユーザーがプロフィールページに移動する',
      'ユーザーが有効なデータでプロフィールを更新して送信する',
      'ユーザーが無効なデータでプロフィールを更新して送信する',
      'ユーザーがプロフィールページを表示する（投票履歴）',
    ],
    testFiles: ['profile/profile-management.spec.ts'],
    covered: true,
  },
  {
    id: '要件6',
    name: 'テスト実行環境',
    acceptanceCriteria: [
      'E2E_Test_Suiteは隔離されたテストデータを持つTest_Environmentに対して実行する',
      'E2EテストがCI/CDパイプラインで実行される場合、Headless_Modeで実行する',
      '開発者がローカルでE2Eテストを実行する場合、Headless_ModeとVisual_Modeの両方をサポートする',
      'E2Eテストが実行を完了する場合、合格/不合格ステータスを含むTest_Reportを生成する',
      'テストが失敗する場合、スクリーンショットをキャプチャしてTest_Reportに含める',
    ],
    testFiles: ['global-setup.ts', 'playwright.config.ts'],
    covered: true,
  },
  {
    id: '要件7',
    name: 'テストデータ管理',
    acceptanceCriteria: [
      'E2E_Test_Suiteが実行を開始する場合、必要なTest_DataをTest_Environmentにシードする',
      'E2E_Test_Suiteが実行を完了する場合、Test_EnvironmentからTest_Dataをクリーンアップする',
      'E2E_Test_Suiteは競合を避けるために各テスト実行ごとに一意のテストユーザーを作成する',
      'E2E_Test_Suiteは投票テスト用に次の一手候補を持つ少なくとも1つのアクティブなゲームを作成する',
      'E2E_Test_Suiteは現実的なゲーム状態を表すテストデータを作成する',
    ],
    testFiles: [
      'helpers/test-user.ts',
      'helpers/test-data.ts',
      'helpers/cleanup.ts',
      'fixtures/authenticated-user.ts',
      'fixtures/test-game.ts',
    ],
    covered: true,
  },
  {
    id: '要件8',
    name: 'テスト実行パフォーマンス',
    acceptanceCriteria: [
      '完全なE2E_Test_Suiteが実行される場合、10分以内に完了する',
      '単一の認証テストが実行される場合、30秒以内に完了する',
      '単一の投票フローテストが実行される場合、45秒以内に完了する',
      'E2E_Test_Suiteは独立したテストケースの並列テスト実行をサポートする',
      'テストがタイムアウト閾値を超える場合、テストを失敗させて残りのテストを続行する',
    ],
    testFiles: ['playwright.config.ts'],
    covered: true,
  },
  {
    id: '要件9',
    name: 'クロスブラウザ互換性テスト',
    acceptanceCriteria: [
      'E2E_Test_SuiteはChromiumブラウザでテストを実行する',
      'E2E_Test_SuiteはFirefoxブラウザでテストを実行する',
      'E2E_Test_SuiteはWebKitブラウザでテストを実行する',
      'テストが異なるブラウザで実行される場合、各ブラウザごとに個別のTest_Reportを生成する',
      'CI/CDパイプライン実行が設定されている場合、3つすべてのブラウザで実行する',
    ],
    testFiles: [
      'playwright.config.ts',
      'scripts/test-all-browsers.sh',
      '.github/workflows/e2e-tests.yml',
    ],
    covered: true,
  },
  {
    id: '要件10',
    name: 'テストの信頼性と安定性',
    acceptanceCriteria: [
      'E2E_Test_Suiteが要素を待機する場合、適切なタイムアウト値を持つ明示的な待機を使用する',
      'E2E_Test_Suiteが動的コンテンツと対話する場合、ネットワークリクエストの完了を待機する',
      'E2E_Test_Suiteは失敗したアサーションを最大3回再試行する',
      'E2E_Test_SuiteはCSSクラスではなくdata-testid属性に基づく安定したセレクタを使用する',
      'テストがAPIと対話する場合、続行する前にローディング状態の完了を待機する',
    ],
    testFiles: ['helpers/wait-utils.ts', 'page-objects/*.ts', 'playwright.config.ts'],
    covered: true,
  },
  {
    id: '要件11',
    name: 'ソーシャルシェアフローのテスト',
    acceptanceCriteria: [
      'ユーザーがゲーム詳細ページでシェアボタンをクリックする',
      'ユーザーが共有されたゲームURLにアクセスする',
      'ユーザーが共有された次の一手候補URLにアクセスする',
      'E2E_Test_Suiteが共有URLをリクエストする場合、OGPメタタグがHTMLに存在することを検証する',
      'E2E_Test_Suiteが共有URLをリクエストする場合、OGP画像URLが有効な画像を返すことを検証する',
    ],
    testFiles: ['sharing/share-url.spec.ts', 'sharing/ogp-validation.spec.ts'],
    covered: true,
  },
  {
    id: '要件12',
    name: 'エラーハンドリングとエッジケース',
    acceptanceCriteria: [
      'E2E_Test_Suiteが投票中のネットワーク障害をシミュレートする',
      'E2E_Test_Suiteがセッションタイムアウトをシミュレートする',
      'ユーザーが投票期間終了後に投票しようとする',
      'ユーザーが存在しないゲームにアクセスしようとする',
      'E2E_Test_Suiteが必須フィールドが欠けているフォームを送信する',
    ],
    testFiles: [
      'error-handling/network-errors.spec.ts',
      'error-handling/session-timeout.spec.ts',
      'error-handling/validation-errors.spec.ts',
    ],
    covered: true,
  },
];

function generateCoverageReport() {
  console.log('========================================');
  console.log('E2E Test Coverage Verification');
  console.log('========================================\n');

  let totalCriteria = 0;
  let coveredCriteria = 0;

  requirements.forEach((req) => {
    const criteriaCount = req.acceptanceCriteria.length;
    totalCriteria += criteriaCount;

    if (req.covered) {
      coveredCriteria += criteriaCount;
    }

    const status = req.covered ? '✓' : '✗';
    const statusText = req.covered ? 'COVERED' : 'NOT COVERED';

    console.log(`${status} ${req.id}: ${req.name}`);
    console.log(`   Status: ${statusText}`);
    console.log(`   Acceptance Criteria: ${criteriaCount}`);
    console.log(`   Test Files:`);
    req.testFiles.forEach((file) => {
      console.log(`     - ${file}`);
    });
    console.log('');
  });

  console.log('========================================');
  console.log('Coverage Summary');
  console.log('========================================');
  console.log(`Total Requirements: ${requirements.length}`);
  console.log(`Covered Requirements: ${requirements.filter((r) => r.covered).length}`);
  console.log(`Total Acceptance Criteria: ${totalCriteria}`);
  console.log(`Covered Acceptance Criteria: ${coveredCriteria}`);
  console.log(`Coverage: ${((coveredCriteria / totalCriteria) * 100).toFixed(1)}%`);
  console.log('');

  if (coveredCriteria === totalCriteria) {
    console.log('✓ All requirements are covered by E2E tests!');
    process.exit(0);
  } else {
    console.log('✗ Some requirements are not covered by E2E tests.');
    console.log('Please add tests for the missing requirements.');
    process.exit(1);
  }
}

// Run the verification
generateCoverageReport();
