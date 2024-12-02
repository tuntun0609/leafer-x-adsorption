module.exports = {
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['prettier', '@typescript-eslint'],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
