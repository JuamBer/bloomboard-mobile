// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores([
    'dist',
    '.expo',
    'android',
    'ios',
    'expo-env.d.ts',
    // Vendored third-party agent skill packs — reference material, not code
    // we ship or maintain.
    '.agents',
  ]),
  expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // A leading underscore marks a binding kept on purpose but not read
      // (a parameter preserved for a call signature) — same rule as the
      // sibling repos.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `axios.create` and `i18n.use` are those libraries' documented API;
      // the rule reads them as a mistaken default import.
      'import/no-named-as-default-member': 'off',
    },
  },
  prettierRecommended,
]);
