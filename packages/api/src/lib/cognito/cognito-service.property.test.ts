import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CognitoService } from './cognito-service.js';
import { SignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

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

/**
 * Feature: user-registration-api
 * Property 7: Cognitoエラーハンドリング
 *
 * **Validates: Requirements 5.3**
 *
 * 任意の登録リクエストに対して、Cognitoサービスがエラーを返した場合、
 * APIは適切なステータスコードとエラーコードを返すべきです
 * （例: UsernameExistsExceptionの場合は409、InvalidPasswordExceptionの場合は400、
 * その他のエラーの場合は500）。
 */
describe('Property 7: Cognito error handling', () => {
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

  it('should throw UsernameExistsException when email already exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: UsernameExistsExceptionをスロー
          const error = new Error('User already exists');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = 'UsernameExistsException';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = 'UsernameExistsException';
          mockSend.mockRejectedValueOnce(error);

          // Act & Assert: エラーがスローされることを確認
          try {
            await service.signUp(data.email, data.password, data.username);
            return false; // エラーがスローされなかった場合は失敗
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            // エラーコードが正しいことを確認
            expect(err.code).toBe('UsernameExistsException');
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should throw InvalidPasswordException when password does not meet requirements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          // 無効なパスワード（要件を満たさない）
          password: fc.oneof(
            fc.constant('short'), // 短すぎる
            fc.constant('nouppercase123'), // 大文字なし
            fc.constant('NOLOWERCASE123'), // 小文字なし
            fc.constant('NoNumbers') // 数字なし
          ),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: InvalidPasswordExceptionをスロー
          const error = new Error('Password does not meet requirements');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = 'InvalidPasswordException';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = 'InvalidPasswordException';
          mockSend.mockRejectedValueOnce(error);

          // Act & Assert: エラーがスローされることを確認
          try {
            await service.signUp(data.email, data.password, data.username);
            return false; // エラーがスローされなかった場合は失敗
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            // エラーコードが正しいことを確認
            expect(err.code).toBe('InvalidPasswordException');
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should throw generic error for other Cognito errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          // 様々なエラータイプを生成
          errorType: fc.oneof(
            fc.constant('InternalErrorException'),
            fc.constant('TooManyRequestsException'),
            fc.constant('InvalidParameterException'),
            fc.constant('ResourceNotFoundException'),
            fc.constant('NotAuthorizedException')
          ),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: 様々なCognitoエラーをスロー
          const error = new Error(`Cognito error: ${data.errorType}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = data.errorType;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = data.errorType;
          mockSend.mockRejectedValueOnce(error);

          // Act & Assert: エラーがスローされることを確認
          try {
            await service.signUp(data.email, data.password, data.username);
            return false; // エラーがスローされなかった場合は失敗
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            // エラーコードが正しいことを確認
            expect(err.code).toBe(data.errorType);
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should throw error when authentication fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // 認証エラーのタイプを生成
          errorType: fc.oneof(
            fc.constant('NotAuthorizedException'),
            fc.constant('UserNotFoundException'),
            fc.constant('InvalidParameterException')
          ),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: 認証エラーをスロー
          const error = new Error(`Authentication error: ${data.errorType}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = data.errorType;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = data.errorType;
          mockSend.mockRejectedValueOnce(error);

          // Act & Assert: エラーがスローされることを確認
          try {
            await service.authenticate(data.email, data.password);
            return false; // エラーがスローされなかった場合は失敗
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            // エラーコードが正しいことを確認
            expect(err.code).toBe(data.errorType);
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle error with various error message formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          // 様々なエラーメッセージを生成
          errorMessage: fc.oneof(
            fc.constant('An account with the given email already exists.'),
            fc.constant(
              'Password did not conform with policy: Password must have uppercase characters'
            ),
            fc.constant(
              "1 validation error detected: Value at 'password' failed to satisfy constraint"
            ),
            fc.string({ minLength: 10, maxLength: 100 })
          ),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: エラーメッセージ付きのエラーをスロー
          const error = new Error(data.errorMessage);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = 'UsernameExistsException';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = 'UsernameExistsException';
          mockSend.mockRejectedValueOnce(error);

          // Act & Assert: エラーがスローされることを確認
          try {
            await service.signUp(data.email, data.password, data.username);
            return false; // エラーがスローされなかった場合は失敗
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            // エラーメッセージが保持されていることを確認
            expect(err.message).toBe(data.errorMessage);
            expect(err.code).toBe('UsernameExistsException');
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should propagate error properties correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          errorCode: fc.oneof(
            fc.constant('UsernameExistsException'),
            fc.constant('InvalidPasswordException'),
            fc.constant('InternalErrorException')
          ),
          statusCode: fc.integer({ min: 400, max: 599 }),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: 詳細なエラー情報を持つエラーをスロー
          const error = new Error('Cognito error');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).name = data.errorCode;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = data.errorCode;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).$metadata = {
            httpStatusCode: data.statusCode,
          };
          mockSend.mockRejectedValueOnce(error);

          // Act & Assert: エラーがスローされることを確認
          try {
            await service.signUp(data.email, data.password, data.username);
            return false; // エラーがスローされなかった場合は失敗
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (err: any) {
            // エラープロパティが正しく伝播されることを確認
            expect(err.code).toBe(data.errorCode);
            expect(err.$metadata?.httpStatusCode).toBe(data.statusCode);
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 10: 認証トークン取得
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 *
 * 任意の有効な登録リクエストに対して、ユーザー登録が正常に完了した場合、
 * APIはCognitoサービスでユーザーを認証し、アクセストークン（15分有効）とリフレッシュトークンを取得し、
 * レスポンスボディに両方のトークンを含めるべきです。
 */
describe('Property 10: Authentication token retrieval', () => {
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

  it('should authenticate user and retrieve access token and refresh token for any valid registration request', async () => {
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
        }),
        async (data) => {
          // モックをリセット（各プロパティテストの実行前）
          mockSend.mockClear();

          // Arrange: モックレスポンスを設定
          const mockAccessToken = `access-token-${Math.random().toString(36).substring(7)}`;
          const mockRefreshToken = `refresh-token-${Math.random().toString(36).substring(7)}`;
          const mockIdToken = `id-token-${Math.random().toString(36).substring(7)}`;

          const mockResponse = {
            AuthenticationResult: {
              AccessToken: mockAccessToken,
              RefreshToken: mockRefreshToken,
              IdToken: mockIdToken,
              ExpiresIn: 900, // 15分 = 900秒
            },
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act: authenticateメソッドを呼び出し
          const result = await service.authenticate(data.email, data.password);

          // Assert 1: レスポンスが定義されていることを確認
          expect(result).toBeDefined();

          // Assert 2: アクセストークンが取得されることを確認（要件 7.2）
          expect(result.accessToken).toBe(mockAccessToken);
          expect(result.accessToken).toBeTruthy();

          // Assert 3: リフレッシュトークンが取得されることを確認（要件 7.3）
          expect(result.refreshToken).toBe(mockRefreshToken);
          expect(result.refreshToken).toBeTruthy();

          // Assert 4: IDトークンも含まれることを確認
          expect(result.idToken).toBe(mockIdToken);

          // Assert 5: expiresInが900秒（15分）であることを確認（要件 7.2）
          expect(result.expiresIn).toBe(900);

          // Assert 6: Cognitoクライアントが正しく呼ばれたことを確認（要件 7.1）
          expect(mockSend).toHaveBeenCalledTimes(1);

          // Assert 7: InitiateAuthCommandが正しいパラメータで呼ばれたことを確認
          const initiateAuthCommand = mockSend.mock.calls[0][0];
          expect(initiateAuthCommand).toBeInstanceOf(InitiateAuthCommand);

          // Assert 8: 認証フローがUSER_PASSWORD_AUTHであることを確認
          expect(initiateAuthCommand.input.AuthFlow).toBe('USER_PASSWORD_AUTH');
          expect(initiateAuthCommand.input.ClientId).toBe('test-client-id');

          // Assert 9: 認証パラメータが正しく設定されていることを確認
          expect(initiateAuthCommand.input.AuthParameters).toBeDefined();
          expect(initiateAuthCommand.input.AuthParameters?.USERNAME).toBe(data.email);
          expect(initiateAuthCommand.input.AuthParameters?.PASSWORD).toBe(data.password);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should use default expiresIn of 900 seconds when not provided by Cognito', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: ExpiresInが未定義のレスポンスを設定
          const mockResponse = {
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              RefreshToken: 'mock-refresh-token',
              IdToken: 'mock-id-token',
              ExpiresIn: undefined, // 未定義の場合
            },
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.authenticate(data.email, data.password);

          // Assert: デフォルト値900秒が使用されることを確認（要件 7.2）
          expect(result.expiresIn).toBe(900);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should retrieve tokens with various token formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // 様々なトークン形式を生成（JWT形式など）
          accessToken: fc.oneof(
            fc.string({ minLength: 50, maxLength: 200 }),
            fc.uuid(),
            fc.base64String({ minLength: 50, maxLength: 200 })
          ),
          refreshToken: fc.oneof(
            fc.string({ minLength: 50, maxLength: 200 }),
            fc.uuid(),
            fc.base64String({ minLength: 50, maxLength: 200 })
          ),
          idToken: fc.oneof(
            fc.string({ minLength: 50, maxLength: 200 }),
            fc.uuid(),
            fc.base64String({ minLength: 50, maxLength: 200 })
          ),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            AuthenticationResult: {
              AccessToken: data.accessToken,
              RefreshToken: data.refreshToken,
              IdToken: data.idToken,
              ExpiresIn: 900,
            },
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.authenticate(data.email, data.password);

          // Assert: 様々なトークン形式が正しく取得されることを確認
          expect(result.accessToken).toBe(data.accessToken);
          expect(result.refreshToken).toBe(data.refreshToken);
          expect(result.idToken).toBe(data.idToken);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should authenticate with edge case email formats', async () => {
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
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              RefreshToken: 'mock-refresh-token',
              IdToken: 'mock-id-token',
              ExpiresIn: 900,
            },
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.authenticate(data.email, data.password);

          // Assert: エッジケースのメールアドレスでも認証できることを確認
          expect(result).toBeDefined();
          expect(result.accessToken).toBeTruthy();
          expect(result.refreshToken).toBeTruthy();
          expect(result.expiresIn).toBe(900);

          const initiateAuthCommand = mockSend.mock.calls[0][0];
          expect(initiateAuthCommand.input.AuthParameters?.USERNAME).toBe(data.email);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should authenticate with various valid password formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.constant('test@example.com'),
          // 様々な有効なパスワード形式を生成
          password: fc.integer({ min: 0, max: 9 }).map((idx) => {
            const validPasswords = [
              'Password1', // 最小要件
              'Password123', // 標準
              'VeryLongPassword123456789', // 長いパスワード
              'P@ssw0rd!', // 特殊文字を含む
              'Pass1234', // 数字が多い
              'PASSWORD1a', // 大文字が多い
              'password1A', // 小文字が多い
              'Aa1Bb2Cc3', // 混合
              'MyP@ssw0rd123!', // 複雑なパスワード
              'Test1234', // シンプル
            ];
            return validPasswords[idx];
          }),
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange
          const mockResponse = {
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              RefreshToken: 'mock-refresh-token',
              IdToken: 'mock-id-token',
              ExpiresIn: 900,
            },
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.authenticate(data.email, data.password);

          // Assert: 様々なパスワード形式で認証できることを確認
          expect(result).toBeDefined();
          expect(result.accessToken).toBeTruthy();
          expect(result.refreshToken).toBeTruthy();
          expect(result.expiresIn).toBe(900);

          const initiateAuthCommand = mockSend.mock.calls[0][0];
          expect(initiateAuthCommand.input.AuthParameters?.PASSWORD).toBe(data.password);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle authentication result with all required token fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          expiresIn: fc.integer({ min: 300, max: 3600 }), // 5分〜1時間
        }),
        async (data) => {
          // モックをリセット
          mockSend.mockClear();

          // Arrange: 様々なexpiresIn値でテスト
          const mockResponse = {
            AuthenticationResult: {
              AccessToken: 'mock-access-token',
              RefreshToken: 'mock-refresh-token',
              IdToken: 'mock-id-token',
              ExpiresIn: data.expiresIn,
            },
          };

          mockSend.mockResolvedValueOnce(mockResponse);

          // Act
          const result = await service.authenticate(data.email, data.password);

          // Assert: すべての必須フィールドが含まれることを確認（要件 7.4）
          expect(result).toBeDefined();
          expect(result.accessToken).toBeTruthy();
          expect(result.refreshToken).toBeTruthy();
          expect(result.idToken).toBeTruthy();
          expect(result.expiresIn).toBe(data.expiresIn);

          // Assert: レスポンスボディに両方のトークンが含まれることを確認（要件 7.4）
          expect(result).toHaveProperty('accessToken');
          expect(result).toHaveProperty('refreshToken');

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
