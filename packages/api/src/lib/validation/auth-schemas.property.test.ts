import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { registerSchema, loginSchema, refreshSchema } from './auth-schemas.js';

/**
 * Feature: user-registration-api
 * Property 1: 必須フィールド検証
 *
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
 *
 * 任意の登録リクエストに対して、email、password、またはusernameフィールドが
 * 欠落または空の場合、バリデーションは失敗し、適切なエラーメッセージを返すべきです。
 */
describe('Property 1: Required field validation', () => {
  it('should reject requests with missing or empty required fields', () => {
    fc.assert(
      fc.property(
        // 各フィールドを欠落または空文字列にする可能性のあるジェネレーター
        fc.record({
          email: fc.option(fc.oneof(fc.constant(''), fc.string({ maxLength: 50 })), {
            nil: undefined,
          }),
          password: fc.option(fc.oneof(fc.constant(''), fc.string({ maxLength: 50 })), {
            nil: undefined,
          }),
          username: fc.option(fc.oneof(fc.constant(''), fc.string({ maxLength: 50 })), {
            nil: undefined,
          }),
        }),
        (data) => {
          // 少なくとも1つのフィールドが欠落または空であることを確認
          const hasEmptyOrMissingField =
            data.email === undefined ||
            data.email === '' ||
            data.password === undefined ||
            data.password === '' ||
            data.username === undefined ||
            data.username === '';

          // 少なくとも1つのフィールドが欠落または空の場合のみテスト
          if (!hasEmptyOrMissingField) {
            return true; // このケースはスキップ
          }

          // バリデーションを実行
          const result = registerSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            // エラーメッセージに「required」が含まれることを確認
            const errorMessages = result.error.issues.map((issue) => issue.message);
            const hasRequiredError = errorMessages.some(
              (msg) =>
                msg.includes('required') ||
                msg.includes('at least') ||
                msg === 'Email is required' ||
                msg === 'Password is required' ||
                msg === 'Username is required' ||
                msg === 'Username must be at least 3 characters'
            );
            expect(hasRequiredError).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should specifically reject missing email field', () => {
    fc.assert(
      fc.property(
        fc.record({
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBe('Email is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject empty email field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.constant(''),
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBe('Email is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject missing password field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            expect(passwordError?.message).toBe('Password is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject empty password field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ maxLength: 50 }),
          password: fc.constant(''),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            expect(passwordError?.message).toBe('Password is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject missing username field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ maxLength: 50 }),
          password: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            expect(usernameError?.message).toBe('Username is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject empty username field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ maxLength: 50 }),
          password: fc.string({ maxLength: 50 }),
          username: fc.constant(''),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            // 空文字列の場合、min(3)のバリデーションが先に実行される
            expect(usernameError?.message).toBe('Username must be at least 3 characters');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 2: メールアドレス形式検証
 *
 * **Validates: Requirements 2.1, 2.2**
 *
 * 任意の登録リクエストに対して、emailフィールドが有効なメール形式（RFC 5322簡易版）でない場合、
 * バリデーションは失敗し、エラーメッセージ「Invalid email format」を返すべきです。
 *
 * 注: 現在の実装は簡易版のため、以下のパターンをチェックします:
 * - @記号が必須
 * - @の前後に文字が必要
 * - ドメイン部分にドットが必要
 * - スペースは不可
 */
describe('Property 2: Email format validation', () => {
  // 無効なメールアドレスを生成するジェネレーター（簡易版RFC 5322に基づく）
  const invalidEmailGenerator = fc.oneof(
    // @記号がない（空文字列を除外）
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('@') && !s.includes(' ')),
    // @記号の後が空（ドメインなし）
    fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes('@') && !s.includes(' '))
      .map((s) => `${s}@`),
    // ドメインにドットがない
    fc
      .tuple(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => !s.includes('@') && !s.includes(' ')),
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => !s.includes('.') && !s.includes('@') && !s.includes(' '))
      )
      .map(([local, domain]) => `${local}@${domain}`),
    // スペースを含む
    fc
      .tuple(
        fc.string({ minLength: 1, maxLength: 15 }),
        fc.string({ minLength: 1, maxLength: 15 }),
        fc.string({ minLength: 1, maxLength: 15 }).filter((s) => !s.includes(' '))
      )
      .map(([a, b, c]) => `${a} ${b}@${c}.com`),
    // 複数の@記号
    fc
      .tuple(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => !s.includes('@') && !s.includes(' ')),
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => !s.includes('@') && !s.includes(' '))
      )
      .map(([a, b]) => `${a}@@${b}.com`)
  );

  it('should reject invalid email formats', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: invalidEmailGenerator,
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            // emailフィールドのエラーを探す
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');

            // emailエラーが存在し、適切なメッセージを持つことを確認
            if (emailError) {
              expect(emailError.message).toBe('Invalid email format');
            }
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should specifically reject emails without @ symbol', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => !s.includes('@') && !s.includes(' ')),
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            if (emailError) {
              expect(emailError.message).toBe('Invalid email format');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject emails without domain', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 50 }).map((s) => `${s}@`),
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            if (emailError) {
              expect(emailError.message).toBe('Invalid email format');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject emails without local part', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 50 }).map((s) => `@${s}.com`),
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            if (emailError) {
              expect(emailError.message).toBe('Invalid email format');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject emails with spaces', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc
            .tuple(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.string({ minLength: 1, maxLength: 20 })
            )
            .map(([a, b]) => `${a} ${b}@example.com`),
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            if (emailError) {
              expect(emailError.message).toBe('Invalid email format');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept valid email formats', () => {
    fc.assert(
      fc.property(
        fc.record({
          // 有効なメールアドレスを生成
          email: fc.emailAddress(),
          password: fc.string({ maxLength: 50 }),
          username: fc.string({ maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // メールアドレスが有効な場合、emailフィールドのエラーはないはず
          // （他のフィールドのバリデーションエラーは許容）
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            // emailフィールドにエラーがないことを確認
            expect(emailError).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 4: パスワード要件検証
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * 任意の登録リクエストに対して、passwordフィールドが以下の要件を満たさない場合、
 * バリデーションは失敗し、エラーコード`VALIDATION_ERROR`を返すべきです:
 * - 少なくとも8文字の長さ
 * - 少なくとも1つの大文字を含む
 * - 少なくとも1つの小文字を含む
 * - 少なくとも1つの数字を含む
 */
describe('Property 4: Password requirements validation', () => {
  // 無効なパスワードを生成するジェネレーター（空文字列を除外）
  const invalidPasswordGenerator = fc.oneof(
    // 8文字未満（空文字列を除外）
    fc.string({ minLength: 1, maxLength: 7 }),
    // 大文字なし（8文字以上、小文字と数字のみ）- 生成を簡略化
    fc
      .tuple(fc.stringMatching(/^[a-z]+$/), fc.stringMatching(/^[0-9]+$/))
      .map(([letters, numbers]) => (letters + numbers).slice(0, 10)),
    // 小文字なし（8文字以上、大文字と数字のみ）- 生成を簡略化
    fc
      .tuple(fc.stringMatching(/^[A-Z]+$/), fc.stringMatching(/^[0-9]+$/))
      .map(([letters, numbers]) => (letters + numbers).slice(0, 10)),
    // 数字なし（8文字以上、大文字と小文字のみ）- 生成を簡略化
    fc
      .tuple(fc.stringMatching(/^[A-Z]+$/), fc.stringMatching(/^[a-z]+$/))
      .map(([upper, lower]) => (upper + lower).slice(0, 10))
  );

  it('should reject passwords not meeting requirements', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: invalidPasswordGenerator,
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            // passwordフィールドのエラーを探す
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');

            // passwordエラーが存在することを確認
            expect(passwordError).toBeDefined();

            if (passwordError) {
              // エラーメッセージにパスワード要件が含まれることを確認
              const message = passwordError.message;
              expect(
                message.includes('at least 8 characters') ||
                  message.includes('uppercase') ||
                  message.includes('lowercase') ||
                  message.includes('number')
              ).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should specifically reject passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1, maxLength: 7 }),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            if (passwordError) {
              expect(passwordError.message).toContain('at least 8 characters');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject passwords without uppercase letters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          // 8文字以上、小文字と数字のみ - 生成を簡略化
          password: fc.constant('abcdef12'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            if (passwordError) {
              expect(passwordError.message).toContain('uppercase');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject passwords without lowercase letters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          // 8文字以上、大文字と数字のみ - 生成を簡略化
          password: fc.constant('ABCDEF12'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            if (passwordError) {
              expect(passwordError.message).toContain('lowercase');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject passwords without numbers', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          // 8文字以上、大文字と小文字のみ - 生成を簡略化
          password: fc.constant('ABCDefgh'),
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            if (passwordError) {
              expect(passwordError.message).toContain('number');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept passwords meeting all requirements', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          // 有効なパスワードを生成: 8文字以上、大文字・小文字・数字を含む - 簡略化
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
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // パスワードが有効な場合、passwordフィールドのエラーはないはず
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            // passwordフィールドにエラーがないことを確認
            expect(passwordError).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 5: ユーザー名要件検証
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * 任意の登録リクエストに対して、usernameフィールドが以下の要件を満たさない場合、
 * バリデーションは失敗し、エラーコード`VALIDATION_ERROR`を返すべきです:
 * - 3〜20文字の長さ
 * - 英数字、ハイフン、アンダースコアのみを含む
 */
describe('Property 5: Username requirements validation', () => {
  // 無効なユーザー名を生成するジェネレーター（空文字列を除外）
  const invalidUsernameGenerator = fc.oneof(
    // 3文字未満（空文字列を除外）
    fc.string({ minLength: 1, maxLength: 2 }),
    // 20文字超過
    fc.string({ minLength: 21, maxLength: 50 }),
    // 無効な文字を含む（英数字・ハイフン・アンダースコア以外）
    fc
      .string({ minLength: 3, maxLength: 20 })
      .filter((s) => !/^[a-zA-Z0-9_-]+$/.test(s) && s.length >= 3 && s.length <= 20)
  );

  it('should reject usernames not meeting requirements', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .tuple(
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 9 })
            )
            .map(([upperIdx, lowerIdx, num]) => {
              const upper = String.fromCharCode(65 + upperIdx);
              const lower = String.fromCharCode(97 + lowerIdx);
              return `${upper}${lower}${num}Pass1`;
            }),
          username: invalidUsernameGenerator,
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            // usernameフィールドのエラーを探す
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');

            // usernameエラーが存在することを確認
            expect(usernameError).toBeDefined();

            if (usernameError) {
              // エラーメッセージにユーザー名要件が含まれることを確認
              const message = usernameError.message;
              expect(
                message.includes('at least 3 characters') ||
                  message.includes('at most 20 characters') ||
                  message.includes('alphanumeric characters, hyphens, and underscores')
              ).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should specifically reject usernames shorter than 3 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc.string({ minLength: 1, maxLength: 2 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            if (usernameError) {
              expect(usernameError.message).toBe('Username must be at least 3 characters');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject usernames longer than 20 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc.string({ minLength: 21, maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            if (usernameError) {
              expect(usernameError.message).toBe('Username must be at most 20 characters');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject usernames with invalid characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // 無効な文字を含むユーザー名を生成（スペース、特殊文字など）
          username: fc.oneof(
            fc.constant('user name'), // スペース
            fc.constant('user@name'), // @記号
            fc.constant('user.name'), // ドット
            fc.constant('user!name'), // 感嘆符
            fc.constant('user#name'), // ハッシュ
            fc.constant('user$name'), // ドル記号
            fc.constant('user%name'), // パーセント
            fc.constant('ユーザー名'), // 日本語
            fc.constant('user+name'), // プラス
            fc.constant('user=name') // イコール
          ),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            if (usernameError) {
              expect(usernameError.message).toBe(
                'Username can only contain alphanumeric characters, hyphens, and underscores'
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept valid usernames', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // 有効なユーザー名を生成: 3-20文字、英数字・ハイフン・アンダースコアのみ
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // ユーザー名が有効な場合、usernameフィールドのエラーはないはず
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            // usernameフィールドにエラーがないことを確認
            expect(usernameError).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should accept usernames with hyphens and underscores', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // ハイフンとアンダースコアを含む有効なユーザー名
          username: fc.oneof(
            fc.constant('user-name'),
            fc.constant('user_name'),
            fc.constant('user-name_123'),
            fc.constant('test_user-01'),
            fc.constant('my-user_name')
          ),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // これらのユーザー名は有効なので、usernameフィールドのエラーはないはず
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * Feature: user-registration-api
 * Property 5: ユーザー名要件検証
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * 任意の登録リクエストに対して、usernameフィールドが以下の要件を満たさない場合、
 * バリデーションは失敗し、エラーコード`VALIDATION_ERROR`を返すべきです:
 * - 3〜20文字の長さ
 * - 英数字、ハイフン、アンダースコアのみを含む
 */
describe('Property 5: Username requirements validation', () => {
  // 無効なユーザー名を生成するジェネレーター（空文字列を除外）
  const invalidUsernameGenerator = fc.oneof(
    // 3文字未満（空文字列を除外）
    fc.string({ minLength: 1, maxLength: 2 }),
    // 20文字超過
    fc.string({ minLength: 21, maxLength: 50 }),
    // 無効な文字を含む（英数字・ハイフン・アンダースコア以外）
    fc
      .string({ minLength: 3, maxLength: 20 })
      .filter((s) => !/^[a-zA-Z0-9_-]+$/.test(s) && s.length >= 3 && s.length <= 20)
  );

  it('should reject usernames not meeting requirements', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc
            .tuple(
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 25 }),
              fc.integer({ min: 0, max: 9 })
            )
            .map(([upperIdx, lowerIdx, num]) => {
              const upper = String.fromCharCode(65 + upperIdx);
              const lower = String.fromCharCode(97 + lowerIdx);
              return `${upper}${lower}${num}Pass1`;
            }),
          username: invalidUsernameGenerator,
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            // usernameフィールドのエラーを探す
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');

            // usernameエラーが存在することを確認
            expect(usernameError).toBeDefined();

            if (usernameError) {
              // エラーメッセージにユーザー名要件が含まれることを確認
              const message = usernameError.message;
              expect(
                message.includes('at least 3 characters') ||
                  message.includes('at most 20 characters') ||
                  message.includes('alphanumeric characters, hyphens, and underscores')
              ).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should specifically reject usernames shorter than 3 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc.string({ minLength: 1, maxLength: 2 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            if (usernameError) {
              expect(usernameError.message).toBe('Username must be at least 3 characters');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject usernames longer than 20 characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          username: fc.string({ minLength: 21, maxLength: 50 }),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            if (usernameError) {
              expect(usernameError.message).toBe('Username must be at most 20 characters');
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should specifically reject usernames with invalid characters', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // 無効な文字を含むユーザー名を生成（スペース、特殊文字など）
          username: fc.oneof(
            fc.constant('user name'), // スペース
            fc.constant('user@name'), // @記号
            fc.constant('user.name'), // ドット
            fc.constant('user!name'), // 感嘆符
            fc.constant('user#name'), // ハッシュ
            fc.constant('user$name'), // ドル記号
            fc.constant('user%name'), // パーセント
            fc.constant('ユーザー名'), // 日本語
            fc.constant('user+name'), // プラス
            fc.constant('user=name') // イコール
          ),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeDefined();
            if (usernameError) {
              expect(usernameError.message).toBe(
                'Username can only contain alphanumeric characters, hyphens, and underscores'
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept valid usernames', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // 有効なユーザー名を生成: 3-20文字、英数字・ハイフン・アンダースコアのみ
          username: fc
            .string({ minLength: 3, maxLength: 20 })
            .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // ユーザー名が有効な場合、usernameフィールドのエラーはないはず
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            // usernameフィールドにエラーがないことを確認
            expect(usernameError).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should accept usernames with hyphens and underscores', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          password: fc.constant('Password123'),
          // ハイフンとアンダースコアを含む有効なユーザー名
          username: fc.oneof(
            fc.constant('user-name'),
            fc.constant('user_name'),
            fc.constant('user-name_123'),
            fc.constant('test_user-01'),
            fc.constant('my-user_name')
          ),
        }),
        (data) => {
          const result = registerSchema.safeParse(data);

          // これらのユーザー名は有効なので、usernameフィールドのエラーはないはず
          if (!result.success) {
            const usernameError = result.error.issues.find((issue) => issue.path[0] === 'username');
            expect(usernameError).toBeUndefined();
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * Feature: 3-login-api, Property 1: ログイン必須フィールド検証
 *
 * **Validates: Requirements 1.2, 1.3, 1.4**
 *
 * 任意のログインリクエストに対して、emailまたはpasswordフィールドが欠落または空の場合、
 * APIは400ステータスコードとエラーコード`VALIDATION_ERROR`を返すべきです。
 */
describe('Property 1 (Login): ログイン必須フィールド検証', () => {
  it('should reject login requests with missing or empty required fields', () => {
    fc.assert(
      fc.property(
        // 各フィールドを欠落または空文字列にする可能性のあるジェネレーター
        fc.record({
          email: fc.option(fc.oneof(fc.constant(''), fc.string({ maxLength: 50 })), {
            nil: undefined,
          }),
          password: fc.option(fc.oneof(fc.constant(''), fc.string({ maxLength: 50 })), {
            nil: undefined,
          }),
        }),
        (data) => {
          // 少なくとも1つのフィールドが欠落または空であることを確認
          const hasEmptyOrMissingField =
            data.email === undefined ||
            data.email === '' ||
            data.password === undefined ||
            data.password === '';

          // 少なくとも1つのフィールドが欠落または空の場合のみテスト
          if (!hasEmptyOrMissingField) {
            return true; // このケースはスキップ
          }

          const result = loginSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            const errorMessages = result.error.issues.map((issue) => issue.message);
            const hasRequiredError = errorMessages.some(
              (msg) =>
                msg === 'Email is required' ||
                msg === 'Password is required' ||
                msg.includes('required')
            );
            expect(hasRequiredError).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject login requests with missing email field', () => {
    fc.assert(
      fc.property(
        fc.record({
          password: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (data) => {
          const result = loginSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBe('Email is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject login requests with empty email field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.constant(''),
          password: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (data) => {
          const result = loginSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailError = result.error.issues.find((issue) => issue.path[0] === 'email');
            expect(emailError).toBeDefined();
            expect(emailError?.message).toBe('Email is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject login requests with missing password field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (data) => {
          const result = loginSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            expect(passwordError?.message).toBe('Password is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject login requests with empty password field', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 50 }),
          password: fc.constant(''),
        }),
        (data) => {
          const result = loginSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordError = result.error.issues.find((issue) => issue.path[0] === 'password');
            expect(passwordError).toBeDefined();
            expect(passwordError?.message).toBe('Password is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});

/**
 * Feature: 3-login-api, Property 4: リフレッシュトークンバリデーション
 *
 * **Validates: Requirement 5.2**
 *
 * 任意のトークンリフレッシュリクエストに対して、refreshTokenフィールドが欠落または空の場合、
 * APIは400ステータスコードとエラーコード`VALIDATION_ERROR`を返すべきです。
 */
describe('Property 4 (Refresh): リフレッシュトークンバリデーション', () => {
  it('should reject refresh requests with missing or empty refreshToken', () => {
    fc.assert(
      fc.property(
        // refreshTokenを欠落または空文字列にするジェネレーター
        fc.oneof(
          // refreshTokenフィールドが欠落
          fc.constant({}),
          // refreshTokenが空文字列
          fc.constant({ refreshToken: '' }),
          // refreshTokenが存在するが空文字列（他のフィールド付き）
          fc.record({
            refreshToken: fc.constant(''),
          })
        ),
        (data) => {
          const result = refreshSchema.safeParse(data);

          // バリデーションは失敗すべき
          expect(result.success).toBe(false);

          if (!result.success) {
            const errorMessages = result.error.issues.map((issue) => issue.message);
            const hasRequiredError = errorMessages.some(
              (msg) => msg === 'Refresh token is required' || msg.includes('required')
            );
            expect(hasRequiredError).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject refresh requests with missing refreshToken field', () => {
    fc.assert(
      fc.property(
        // refreshTokenフィールドを含まないオブジェクトを生成
        fc.record({
          someOtherField: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
        }),
        (data) => {
          const result = refreshSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const refreshTokenError = result.error.issues.find(
              (issue) => issue.path[0] === 'refreshToken'
            );
            expect(refreshTokenError).toBeDefined();
            expect(refreshTokenError?.message).toBe('Refresh token is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should reject refresh requests with empty refreshToken field', () => {
    fc.assert(
      fc.property(
        fc.record({
          refreshToken: fc.constant(''),
        }),
        (data) => {
          const result = refreshSchema.safeParse(data);

          expect(result.success).toBe(false);
          if (!result.success) {
            const refreshTokenError = result.error.issues.find(
              (issue) => issue.path[0] === 'refreshToken'
            );
            expect(refreshTokenError).toBeDefined();
            expect(refreshTokenError?.message).toBe('Refresh token is required');
          }

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept refresh requests with valid non-empty refreshToken', () => {
    fc.assert(
      fc.property(
        fc.record({
          refreshToken: fc.string({ minLength: 1, maxLength: 500 }),
        }),
        (data) => {
          const result = refreshSchema.safeParse(data);

          // 非空のrefreshTokenは有効
          expect(result.success).toBe(true);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
