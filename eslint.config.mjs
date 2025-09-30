// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // 忽略项（Flat Config 下推荐在配置里声明）
  {
    ignores: [
      'eslint.config.*',
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'packages/*/dist/',
      'packages/*/build/',
      '**/*.min.js'
    ]
  },

  // 核心推荐
  js.configs.recommended,

  {
    files: ['scripts/**/*.{js,ts}', 'docs/**/*.{js,ts}'],
    languageOptions: { globals: globals.node }
  },
  // TypeScript 推荐（无类型感知，运行更快；需要类型感知见下方“可选增强”）
  ...tseslint.configs.recommended,

  // 关闭与 Prettier 冲突的风格类规则
  eslintConfigPrettier,

  // 将 Prettier 作为 ESLint 规则来高亮与修复
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'error',
      // 可按需在此细化 TS 噪音级别，例如：
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
];
