import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CognitoService } from './cognito-service.js';
import {
  SignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

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

describe('CognitoService', () => {
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

  describe('signUp', () => {
    describe('成功ケース', () => {
      it('有効なパラメータでユーザーを作成する', async () => {
        // Arrange
        const email = 'test@example.com';
        const password = 'Password123';
        const username = 'testuser';

        const mockResponse = {
          UserSub: 'test-user-sub-123',
          UserConfirmed: false,
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await service.signUp(email, password, username);

        // Assert
        expect(result).toEqual({
          userId: 'test-user-sub-123',
          userConfirmed: false,
        });

        // Cognitoクライアントが正しく呼ばれたことを確認
        expect(mockSend).toHaveBeenCalledTimes(1);
        const signUpCommand = mockSend.mock.calls[0][0];
        expect(signUpCommand).toBeInstanceOf(SignUpCommand);
        expect(signUpCommand.input).toEqual({
          ClientId: 'test-client-id',
          Username: email,
          Password: password,
          UserAttributes: [
            {
              Name: 'email',
              Value: email,
            },
            {
              Name: 'preferred_username',
              Value: username,
            },
          ],
        });
      });

      it('UserConfirmedがtrueの場合も正しく処理する', async () => {
        // Arrange
        const email = 'confirmed@example.com';
        const password = 'Password456';
        const username = 'confirmeduser';

        const mockResponse = {
          UserSub: 'confirmed-user-sub',
          UserConfirmed: true,
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await service.signUp(email, password, username);

        // Assert
        expect(result).toEqual({
          userId: 'confirmed-user-sub',
          userConfirmed: true,
        });
      });

      it('UserConfirmedが未定義の場合はfalseとして扱う', async () => {
        // Arrange
        const email = 'undefined@example.com';
        const password = 'Password789';
        const username = 'undefineduser';

        const mockResponse = {
          UserSub: 'undefined-user-sub',
          UserConfirmed: undefined,
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await service.signUp(email, password, username);

        // Assert
        expect(result).toEqual({
          userId: 'undefined-user-sub',
          userConfirmed: false,
        });
      });
    });

    describe('UsernameExistsException', () => {
      it('メールアドレスが既に存在する場合はエラーをスローする', async () => {
        // Arrange
        const email = 'existing@example.com';
        const password = 'Password123';
        const username = 'existinguser';

        const usernameExistsError = new Error('User already exists');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (usernameExistsError as any).name = 'UsernameExistsException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (usernameExistsError as any).code = 'UsernameExistsException';

        mockSend.mockRejectedValueOnce(usernameExistsError);

        // Act & Assert
        await expect(service.signUp(email, password, username)).rejects.toThrow(
          'User already exists'
        );
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('UsernameExistsExceptionのエラーコードが正しく伝播される', async () => {
        // Arrange
        const email = 'duplicate@example.com';
        const password = 'Password456';
        const username = 'duplicateuser';

        const usernameExistsError = new Error('An account with the given email already exists.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (usernameExistsError as any).name = 'UsernameExistsException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (usernameExistsError as any).code = 'UsernameExistsException';

        mockSend.mockRejectedValueOnce(usernameExistsError);

        // Act & Assert
        try {
          await service.signUp(email, password, username);
          expect.fail('Should have thrown an error');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          expect(error.code).toBe('UsernameExistsException');
          expect(error.name).toBe('UsernameExistsException');
        }
      });
    });

    describe('その他のエラー', () => {
      it('InvalidPasswordExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'weak@example.com';
        const password = 'weak';
        const username = 'weakuser';

        const invalidPasswordError = new Error('Password does not meet requirements');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (invalidPasswordError as any).name = 'InvalidPasswordException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (invalidPasswordError as any).code = 'InvalidPasswordException';

        mockSend.mockRejectedValueOnce(invalidPasswordError);

        // Act & Assert
        await expect(service.signUp(email, password, username)).rejects.toThrow(
          'Password does not meet requirements'
        );
      });

      it('予期しないエラーの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'error@example.com';
        const password = 'Password123';
        const username = 'erroruser';

        const unexpectedError = new Error('Unexpected Cognito error');
        mockSend.mockRejectedValueOnce(unexpectedError);

        // Act & Assert
        await expect(service.signUp(email, password, username)).rejects.toThrow(
          'Unexpected Cognito error'
        );
      });
    });
  });

  describe('authenticate', () => {
    describe('成功ケース', () => {
      it('有効な認証情報でトークンを取得する', async () => {
        // Arrange
        const email = 'auth@example.com';
        const password = 'Password123';

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
        const result = await service.authenticate(email, password);

        // Assert
        expect(result).toEqual({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          idToken: 'mock-id-token',
          expiresIn: 900,
        });

        // Cognitoクライアントが正しく呼ばれたことを確認
        expect(mockSend).toHaveBeenCalledTimes(1);
        const initiateAuthCommand = mockSend.mock.calls[0][0];
        expect(initiateAuthCommand).toBeInstanceOf(InitiateAuthCommand);
        expect(initiateAuthCommand.input).toEqual({
          ClientId: 'test-client-id',
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        });
      });

      it('ExpiresInが未定義の場合はデフォルト値900を使用する', async () => {
        // Arrange
        const email = 'default@example.com';
        const password = 'Password456';

        const mockResponse = {
          AuthenticationResult: {
            AccessToken: 'mock-access-token-2',
            RefreshToken: 'mock-refresh-token-2',
            IdToken: 'mock-id-token-2',
            ExpiresIn: undefined,
          },
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await service.authenticate(email, password);

        // Assert
        expect(result.expiresIn).toBe(900);
      });
    });

    describe('認証失敗', () => {
      it('AuthenticationResultが存在しない場合はエラーをスローする', async () => {
        // Arrange
        const email = 'noauth@example.com';
        const password = 'Password123';

        const mockResponse = {
          AuthenticationResult: undefined,
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act & Assert
        await expect(service.authenticate(email, password)).rejects.toThrow(
          'Authentication failed'
        );
      });

      it('NotAuthorizedExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'wrong@example.com';
        const password = 'WrongPassword';

        const notAuthorizedError = new Error('Incorrect username or password');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (notAuthorizedError as any).name = 'NotAuthorizedException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (notAuthorizedError as any).code = 'NotAuthorizedException';

        mockSend.mockRejectedValueOnce(notAuthorizedError);

        // Act & Assert
        await expect(service.authenticate(email, password)).rejects.toThrow(
          'Incorrect username or password'
        );
      });

      it('UserNotFoundExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'notfound@example.com';
        const password = 'Password123';

        const userNotFoundError = new Error('User does not exist');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userNotFoundError as any).name = 'UserNotFoundException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userNotFoundError as any).code = 'UserNotFoundException';

        mockSend.mockRejectedValueOnce(userNotFoundError);

        // Act & Assert
        await expect(service.authenticate(email, password)).rejects.toThrow('User does not exist');
      });
    });
  });

  describe('deleteUser', () => {
    describe('成功ケース', () => {
      it('有効なユーザーIDでユーザーを削除する', async () => {
        // Arrange
        const userId = 'user-to-delete-123';

        mockSend.mockResolvedValueOnce({});

        // Act
        await service.deleteUser(userId);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);
        const deleteCommand = mockSend.mock.calls[0][0];
        expect(deleteCommand).toBeInstanceOf(AdminDeleteUserCommand);
        expect(deleteCommand.input).toEqual({
          UserPoolId: 'test-user-pool-id',
          Username: userId,
        });
      });

      it('削除が成功した場合は何も返さない', async () => {
        // Arrange
        const userId = 'another-user-456';

        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await service.deleteUser(userId);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('エラーケース', () => {
      it('ユーザーが存在しない場合でもエラーをスローしない（ログのみ）', async () => {
        // Arrange
        const userId = 'non-existent-user';

        const userNotFoundError = new Error('User does not exist');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userNotFoundError as any).name = 'UserNotFoundException';

        mockSend.mockRejectedValueOnce(userNotFoundError);

        // Act & Assert
        // エラーをスローせず、正常に完了することを確認
        await expect(service.deleteUser(userId)).resolves.toBeUndefined();
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('予期しないエラーの場合でもエラーをスローしない（ログのみ）', async () => {
        // Arrange
        const userId = 'error-user';

        const unexpectedError = new Error('Unexpected error');
        mockSend.mockRejectedValueOnce(unexpectedError);

        // Act & Assert
        // エラーをスローせず、正常に完了することを確認
        await expect(service.deleteUser(userId)).resolves.toBeUndefined();
      });

      it('削除失敗時もロールバック処理を継続できる', async () => {
        // Arrange
        const userId = 'rollback-user';

        const serviceError = new Error('Service unavailable');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (serviceError as any).name = 'ServiceUnavailable';

        mockSend.mockRejectedValueOnce(serviceError);

        // Act
        await service.deleteUser(userId);

        // Assert
        // エラーがスローされないことを確認（ロールバック処理が継続される）
        expect(mockSend).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('refreshTokens', () => {
    describe('成功ケース', () => {
      it('有効なリフレッシュトークンで新しいトークンを取得する', async () => {
        // Arrange
        const refreshToken = 'valid-refresh-token';

        const mockResponse = {
          AuthenticationResult: {
            AccessToken: 'new-access-token',
            IdToken: 'new-id-token',
            ExpiresIn: 900,
          },
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await service.refreshTokens(refreshToken);

        // Assert
        expect(result).toEqual({
          accessToken: 'new-access-token',
          idToken: 'new-id-token',
          expiresIn: 900,
        });

        // Cognitoクライアントが正しく呼ばれたことを確認
        expect(mockSend).toHaveBeenCalledTimes(1);
        const initiateAuthCommand = mockSend.mock.calls[0][0];
        expect(initiateAuthCommand).toBeInstanceOf(InitiateAuthCommand);
        expect(initiateAuthCommand.input).toEqual({
          ClientId: 'test-client-id',
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        });
      });

      it('ExpiresInが未定義の場合はデフォルト値900を使用する', async () => {
        // Arrange
        const refreshToken = 'valid-refresh-token-2';

        const mockResponse = {
          AuthenticationResult: {
            AccessToken: 'new-access-token-2',
            IdToken: 'new-id-token-2',
            ExpiresIn: undefined,
          },
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act
        const result = await service.refreshTokens(refreshToken);

        // Assert
        expect(result.expiresIn).toBe(900);
      });
    });

    describe('失敗ケース', () => {
      it('NotAuthorizedExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const refreshToken = 'expired-refresh-token';

        const notAuthorizedError = new Error('Refresh token is invalid or expired');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (notAuthorizedError as any).name = 'NotAuthorizedException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (notAuthorizedError as any).code = 'NotAuthorizedException';

        mockSend.mockRejectedValueOnce(notAuthorizedError);

        // Act & Assert
        await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
          'Refresh token is invalid or expired'
        );
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('AuthenticationResultが存在しない場合はエラーをスローする', async () => {
        // Arrange
        const refreshToken = 'bad-refresh-token';

        const mockResponse = {
          AuthenticationResult: undefined,
        };

        mockSend.mockResolvedValueOnce(mockResponse);

        // Act & Assert
        await expect(service.refreshTokens(refreshToken)).rejects.toThrow('Token refresh failed');
      });
    });
  });

  describe('forgotPassword', () => {
    describe('成功ケース', () => {
      it('有効なメールアドレスで確認コード送信を要求する', async () => {
        // Arrange
        const email = 'reset@example.com';
        mockSend.mockResolvedValueOnce({});

        // Act
        await service.forgotPassword(email);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);
        const forgotPasswordCommand = mockSend.mock.calls[0][0];
        expect(forgotPasswordCommand).toBeInstanceOf(ForgotPasswordCommand);
        expect(forgotPasswordCommand.input).toEqual({
          ClientId: 'test-client-id',
          Username: email,
        });
      });

      it('forgotPasswordが成功した場合は何も返さない', async () => {
        // Arrange
        const email = 'void@example.com';
        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await service.forgotPassword(email);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('失敗ケース', () => {
      it('UserNotFoundExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'notfound@example.com';

        const userNotFoundError = new Error('User does not exist');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userNotFoundError as any).name = 'UserNotFoundException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userNotFoundError as any).code = 'UserNotFoundException';

        mockSend.mockRejectedValueOnce(userNotFoundError);

        // Act & Assert
        await expect(service.forgotPassword(email)).rejects.toThrow('User does not exist');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('UserNotFoundExceptionのエラー名が正しく伝播される', async () => {
        // Arrange
        const email = 'unknown@example.com';

        const userNotFoundError = new Error('User does not exist');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (userNotFoundError as any).name = 'UserNotFoundException';

        mockSend.mockRejectedValueOnce(userNotFoundError);

        // Act & Assert
        try {
          await service.forgotPassword(email);
          expect.fail('Should have thrown an error');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          expect(error.name).toBe('UserNotFoundException');
        }
      });
    });
  });

  describe('confirmForgotPassword', () => {
    describe('成功ケース', () => {
      it('有効なパラメータでパスワードをリセットする', async () => {
        // Arrange
        const email = 'reset@example.com';
        const confirmationCode = '123456';
        const newPassword = 'NewPassword1';
        mockSend.mockResolvedValueOnce({});

        // Act
        await service.confirmForgotPassword(email, confirmationCode, newPassword);

        // Assert
        expect(mockSend).toHaveBeenCalledTimes(1);
        const confirmCommand = mockSend.mock.calls[0][0];
        expect(confirmCommand).toBeInstanceOf(ConfirmForgotPasswordCommand);
        expect(confirmCommand.input).toEqual({
          ClientId: 'test-client-id',
          Username: email,
          ConfirmationCode: confirmationCode,
          Password: newPassword,
        });
      });

      it('confirmForgotPasswordが成功した場合は何も返さない', async () => {
        // Arrange
        const email = 'success@example.com';
        const confirmationCode = '654321';
        const newPassword = 'SecurePass1';
        mockSend.mockResolvedValueOnce({});

        // Act
        const result = await service.confirmForgotPassword(email, confirmationCode, newPassword);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('失敗ケース', () => {
      it('CodeMismatchExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'mismatch@example.com';
        const confirmationCode = '000000';
        const newPassword = 'NewPassword1';

        const codeMismatchError = new Error('Invalid verification code provided');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (codeMismatchError as any).name = 'CodeMismatchException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (codeMismatchError as any).code = 'CodeMismatchException';

        mockSend.mockRejectedValueOnce(codeMismatchError);

        // Act & Assert
        await expect(
          service.confirmForgotPassword(email, confirmationCode, newPassword)
        ).rejects.toThrow('Invalid verification code provided');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('CodeMismatchExceptionのエラー名が正しく伝播される', async () => {
        // Arrange
        const email = 'code@example.com';
        const confirmationCode = '111111';
        const newPassword = 'NewPassword1';

        const codeMismatchError = new Error('Invalid verification code');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (codeMismatchError as any).name = 'CodeMismatchException';

        mockSend.mockRejectedValueOnce(codeMismatchError);

        // Act & Assert
        try {
          await service.confirmForgotPassword(email, confirmationCode, newPassword);
          expect.fail('Should have thrown an error');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          expect(error.name).toBe('CodeMismatchException');
        }
      });

      it('ExpiredCodeExceptionの場合はエラーをスローする', async () => {
        // Arrange
        const email = 'expired@example.com';
        const confirmationCode = '999999';
        const newPassword = 'NewPassword1';

        const expiredCodeError = new Error('Invalid code provided, please request a code again');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (expiredCodeError as any).name = 'ExpiredCodeException';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (expiredCodeError as any).code = 'ExpiredCodeException';

        mockSend.mockRejectedValueOnce(expiredCodeError);

        // Act & Assert
        await expect(
          service.confirmForgotPassword(email, confirmationCode, newPassword)
        ).rejects.toThrow('Invalid code provided, please request a code again');
        expect(mockSend).toHaveBeenCalledTimes(1);
      });

      it('ExpiredCodeExceptionのエラー名が正しく伝播される', async () => {
        // Arrange
        const email = 'expiredcode@example.com';
        const confirmationCode = '888888';
        const newPassword = 'NewPassword1';

        const expiredCodeError = new Error('Code has expired');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (expiredCodeError as any).name = 'ExpiredCodeException';

        mockSend.mockRejectedValueOnce(expiredCodeError);

        // Act & Assert
        try {
          await service.confirmForgotPassword(email, confirmationCode, newPassword);
          expect.fail('Should have thrown an error');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          expect(error.name).toBe('ExpiredCodeException');
        }
      });
    });
  });

  describe('extractUserIdFromIdToken', () => {
    it('IDトークンからsubクレームを正しく抽出する', () => {
      // Arrange
      const payload = { sub: 'test-user-id-123', email: 'test@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const testIdToken = `header.${encodedPayload}.signature`;

      // Act
      const userId = service.extractUserIdFromIdToken(testIdToken);

      // Assert
      expect(userId).toBe('test-user-id-123');
    });

    it('UUID形式のsubクレームを正しく抽出する', () => {
      // Arrange
      const payload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        iss: 'https://cognito-idp.ap-northeast-1.amazonaws.com/test-pool',
      };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const testIdToken = `eyJhbGciOiJSUzI1NiJ9.${encodedPayload}.mock-signature`;

      // Act
      const userId = service.extractUserIdFromIdToken(testIdToken);

      // Assert
      expect(userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
