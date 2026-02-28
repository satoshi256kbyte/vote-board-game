import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/cdk.out/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/next-env.d.ts',
      '**/.eslintrc.cjs',
      '**/build.mjs',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      'no-undef': 'off',
    },
  }
);
