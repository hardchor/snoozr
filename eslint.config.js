import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
      'import/default': 'off',
      'import/extensions': 'off',
      'import/no-named-as-default-member': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  prettier
);
