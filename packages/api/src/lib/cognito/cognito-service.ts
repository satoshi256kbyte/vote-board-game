import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
  ForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export interface SignUpResult {
  userId: string;
  userConfirmed: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface RefreshResult {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID!;
    this.clientId = process.env.COGNITO_CLIENT_ID!;
  }

  /**
   * Cognitoにユーザーを作成
   */
  async signUp(email: string, password: string, username: string): Promise<SignUpResult> {
    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
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

      const response = await this.client.send(command);

      return {
        userId: response.UserSub!,
        userConfirmed: response.UserConfirmed || false,
      };
    } catch (error) {
      console.error('Cognito SignUp error:', error);
      throw error;
    }
  }

  /**
   * ユーザーを認証してトークンを取得
   */
  async authenticate(email: string, password: string): Promise<AuthTokens> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await this.client.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        refreshToken: response.AuthenticationResult.RefreshToken!,
        idToken: response.AuthenticationResult.IdToken!,
        expiresIn: response.AuthenticationResult.ExpiresIn || 900,
      };
    } catch (error) {
      console.error('Cognito authentication error:', error);
      throw error;
    }
  }

  /**
   * Cognitoユーザーを削除（ロールバック用）
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: userId,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Failed to delete Cognito user:', error);
      // ロールバック失敗はログのみ（手動対応が必要）
    }
  }

  /**
   * リフレッシュトークンで新しいアクセストークンを取得
   */
  async refreshTokens(refreshToken: string): Promise<RefreshResult> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.client.send(command);

      if (!response.AuthenticationResult) {
        throw new Error('Token refresh failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        expiresIn: response.AuthenticationResult.ExpiresIn || 900,
      };
    } catch (error) {
      console.error('Cognito token refresh error:', error);
      throw error;
    }
  }

  /**
   * パスワードリセット用の確認コードを送信
   */
  async forgotPassword(email: string): Promise<void> {
    const command = new ForgotPasswordCommand({
      ClientId: this.clientId,
      Username: email,
    });
    await this.client.send(command);
  }

  /**
   * IDトークンからsubクレーム（userId）を抽出
   */
  extractUserIdFromIdToken(idToken: string): string {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return payload.sub;
  }
}
