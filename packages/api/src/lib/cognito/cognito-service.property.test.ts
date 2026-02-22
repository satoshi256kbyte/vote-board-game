import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CognitoService } from './cognito-service.js';
import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

// CognitoIdentityProviderClientをモック
vi.mock('@aws-sdk/client-cognito-identity-provider', async () => {
  const actual = await vi.importActual('@aws-sdk/client-cognito-identity-provider');
  return {
    ...actual,
    CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  };
});

/**
 * Feature: user-registration-api
 * Property 6: Cognitoユーザー作成
 *
 * **Validates: Requirements 5.1, 5.2, 5.4**
 *
 * 任意の有効な登録リクエストに対して、すべての検証が通過した場合、
 * APIはCognitoサービスに新しいユーザーを作成し、メールアドレスをusername属性として、
 * ユーザー名をpreferred_username属性として設定し、レスポンスからuserIdを抽出すべきです。
 */
describe('Property 6: Cognito user creation', () => {
  let service: CognitoService;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // 環境変数を設定
    process.env.AWS_REGION = 'ap-northeast-1';
    process.env.COGNITO_USER_POOL_ID = 'test-user-pool-id';
    process.env.COGNITO_CLIENT_ID = 'test-client-id';

    // モックをリセット
    vi.clearAllMocks();

    // サービスインスタンスを作成
    service = new CognitoService();

    // モックされたsendメソッドを取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSend = (service as any).client.send;
  });

  it('should create Cognito user with email as username and username as preferred_username for any valid registration request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // 有効なメールアドレスを生成
          email: fc.emailAddress(),
          // 有効なパスワードを生成: 8文字以上、大文字・小文字・数字を含む
          password: fc
            .tuple(
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 9 }),
              fc.integer({ min: 0, max: 5 })
            )
            .map(([upperIdx, lowerIdx, num, extra]) => {
              const upper = String.fromCharCode(65 + upperIdx); // A-Z
              const lower = String.fromCharCode(97 + lowerIdx); // a-z
              const extraChars = 'abcABC123'.slice(0, extra);
              return `${upper}${lower}${num}${extraChars}Pass1`;
            }),
          // 有効なユーザー名を生成: 3-20文字、英数字・ハイフン・アンダースコアのみ
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // モックをリセット（各プロパティテストの実行前）
          mockSend.mockClear();

          // Arrange: モックレスポンスを設定
          const mockUserId = `user-${Math.random().toString(36).substring(7)}`;
          const mockResponse = {
            UserSub: mockUserId,
            UserConfirmed: false,
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act: signUpメソッドを呼び出し
          const result = await service.signUp(data.email, data.password, data.username);

          // Assert 1: レスポンスからuserIdが抽出されることを確認
          expect(result).toBeDefined();
          expect(result.userId).toBe(mockUserId);
          expect(result.userConfirmed).toBe(false);

          // Assert 2: Cognitoクライアントが正しく呼ばれたことを確認
          expect(mockSend).toHaveBeenCalledTimes(1);

          // Assert 3: SignUpCommandが正しいパラメータで呼ばれたことを確認
          const signUpCommand = mockSend.mock.calls[0][0];
          expect(signUpCommand).toBeInstanceOf(SignUpCommand);

          // Assert 4: メールアドレスがusername属性として設定されていることを確認
          expect(signUpCommand.input.Username).toBe(data.email);
          expect(signUpCommand.input.ClientId).toBe('test-client-id');
          expect(signUpCommand.input.Password).toBe(data.password);

          // Assert 5: UserAttributesが正しく設定されていることを確認
          expect(signUpCommand.input.UserAttributes).toBeDefined();
          expect(signUpCommand.input.UserAttributes).toHaveLength(2);

          // Assert 6: emailがemail属性として設定されていることを確認
          const emailAttribute = signUpCommand.input.UserAttributes?.find(
            (attr) => attr.Name === 'email'
          );
          expect(emailAttribute).toBeDefined();
          expect(emailAttribute?.Value).toBe(data.email);

          // Assert 7: usernameがpreferred_username属性として設定されていることを確認
          const usernameAttribute = signUpCommand.input.UserAttributes?.find(
            (attr) => attr.Name === 'preferred_username'
          );
          expect(usernameAttribute).toBeDefined();
          expect(usernameAttribute?.Value).toBe(data.username);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should extract userId from Cognito response for various UserSub formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc.constant('testuser'),
          // 様々なUserSub形式を生成（UUID形式など）
          userSub: fc.oneof(fc.uuid(), fc.string({ minLength: 10, maxLength: 50 })),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            UserSub: data.userSub,
            UserConfirmed: false,
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.signUp(data.email, data.password, data.username);

          // Assert: UserSubがuserIdとして正しく抽出されることを確認
          expect(result.userId).toBe(data.userSub);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle UserConfirmed flag correctly for any valid registration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          // UserConfirmedフラグの様々な値を生成
          userConfirmed: fc.oneof(fc.constant(true), fc.constant(false), fc.constant(undefined)),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            UserSub: 'test-user-sub',
            UserConfirmed: data.userConfirmed,
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.signUp(data.email, data.password, data.username);

          // Assert: UserConfirmedが正しく処理されることを確認
          // undefinedの場合はfalseとして扱われる
          expect(result.userConfirmed).toBe(data.userConfirmed || false);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should create user with correct attributes for edge case usernames', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // エッジケースのユーザー名を生成
          username: fc.integer({ min: 0, max: 9 }).map((idx) => {
            const edgeCases = [
              'abc', // 最小長（3文字）
              '12345678901234567890', // 最大長（20文字）
              'user-name', // ハイフンを含む
              'user_name', // アンダースコアを含む
              'user-name_123', // ハイフンとアンダースコアの組み合わせ
              '123', // 数字のみ
              'ABC', // 大文字のみ
              'abc', // 小文字のみ
              'a1-', // 混合
              '_-_', // 特殊文字のみ（有効）
            ];
            return edgeCases[idx];
          }),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            UserSub: 'test-user-sub',
            UserConfirmed: false,
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.signUp(data.email, data.password, data.username);

          // Assert: エッジケースのユーザー名でも正しく処理されることを確認
          expect(result).toBeDefined();
          expect(result.userId).toBe('test-user-sub');

          const signUpCommand = mockSend.mock.calls[0][0];
          const usernameAttribute = signUpCommand.input.UserAttributes?.find(
            (attr) => attr.Name === 'preferred_username'
          );
          expect(usernameAttribute?.Value).toBe(data.username);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should create user with correct attributes for edge case emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // エッジケースのメールアドレスを生成
          email: fc.integer({ min: 0, max: 8 }).map((idx) => {
            const edgeCases = [
              'a@b.c', // 最小形式
              'user+tag@example.com', // プラス記号
              'user.name@example.com', // ドット
              'user_name@example.com', // アンダースコア
              'user-name@example.com', // ハイフン
              '123@example.com', // 数字のみのローカル部
              'user@sub.example.com', // サブドメイン
              'user@example.co.jp', // 複数ドット
              'test@test.test', // 短いドメイン
            ];
            return edgeCases[idx];
          }),
          password: fc.constant('Password123'),
          username: fc.constant('testuser'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            UserSub: 'test-user-sub',
            UserConfirmed: false,
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.signUp(data.email, data.password, data.username);

          // Assert: エッジケースのメールアドレスでも正しく処理されることを確認
          expect(result).toBeDefined();
          expect(result.userId).toBe('test-user-sub');

          const signUpCommand = mockSend.mock.calls[0][0];
          expect(signUpCommand.input.Username).toBe(data.email);

          const emailAttribute = signUpCommand.input.UserAttributes?.find(
            (attr) => attr.Name === 'email'
          );
          expect(emailAttribute?.Value).toBe(data.email);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
