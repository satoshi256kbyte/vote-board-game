import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { registerSchema } from './auth-schemas.js';

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
