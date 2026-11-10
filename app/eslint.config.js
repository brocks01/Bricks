// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Design-system guard rails (docs/02_DESIGN_PRINCIPLES.md):
 * - colours and sizes live only in src/theme
 * - screens read platform flags from src/lib/platform.ts, never Platform.OS
 * - all text goes through our Text primitive, so the type scale and language fonts apply
 */
const designSystemRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
      message: 'Use a colour token from @/theme instead of a hex value.',
    },
    {
      selector: "MemberExpression[object.name='Platform'][property.name='OS']",
      message: 'Read a capability flag from @/lib/platform instead of checking Platform.OS.',
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'react-native',
          importNames: ['Text'],
          message: 'Use Text from @/components/primitives so the type scale and fonts apply.',
        },
      ],
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: designSystemRules,
  },
  {
    // The only places allowed to touch raw values.
    files: ['src/theme/**', 'src/lib/platform.ts', 'src/components/primitives/Text.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: {
      globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly' },
    },
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]);
