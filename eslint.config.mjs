import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.ts'];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'database-store/**',
      'sessions/**',
    ],
  },
  {
    ...eslint.configs.recommended,
    files: sourceFiles,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: sourceFiles,
  })),
  {
    files: sourceFiles,
    rules: {
      // The bot integrates several untyped external APIs and Baileys payloads;
      // explicit any remains allowed at those boundaries while other type-aware
      // rules still catch unused variables, unsafe directives and dead code.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', caughtErrors: 'none' },
      ],
      // Intentional compatibility/error-normalization patterns in integrations.
      'preserve-caught-error': 'off',
      'no-misleading-character-class': 'off',
      'no-control-regex': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
