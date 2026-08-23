const { defineConfig } = require('eslint/config');
const ts = require('@typescript-eslint/eslint-plugin');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,

  {
    rules: {
      // JSX text is entity-decoded at compile time either way, and in React
      // Native these strings live in <Text>, not HTML — escaping apostrophes
      // here only makes copy harder to read.
      'react/no-unescaped-entities': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Base no-unused-vars doesn't understand TS type-only positions (e.g. a
      // named parameter in a function-type prop), so defer to the TS-aware
      // version above.
      'no-unused-vars': 'off',
    },
  },

  {
    ignores: [
      'node_modules/',
      'dist/',
      'web-build/',
      '.expo/',
      'android/',
      'ios/',
      'expo-env.d.ts',
      'scripts/flame-outlines.json',
    ],
  },
]);
