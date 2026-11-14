// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const designSystem = require('./eslint/design-system');

/**
 * Design-system guard rails (docs/02_DESIGN_PRINCIPLES.md):
 * - colours and sizes live only in src/theme
 * - screens read platform flags from src/lib/platform.ts, never Platform.OS
 * - all text goes through our Text primitive, so the type scale and language fonts apply
 * - no hardcoded sizes, colours or words, and every page renders <Screen>
 *   (eslint/design-system.js), so a new page looks like the rest without extra work
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
  // eslint/design-system.js: no hardcoded sizes, colours or words; every page uses <Screen>.
  'design-system/no-raw-sizes': 'error',
  'design-system/no-raw-colors': 'error',
  'design-system/no-hardcoded-copy': 'error',
  'design-system/page-uses-screen': 'error',
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'design-system': designSystem },
    rules: designSystemRules,
  },
  {
    // Not screens: helpers, data and test set-up may use plain numbers and words.
    files: ['src/lib/**', 'src/api/**', 'src/mocks/**', 'src/state/**', 'src/test-utils/**'],
    rules: {
      'design-system/no-raw-sizes': 'off',
      'design-system/no-hardcoded-copy': 'off',
    },
  },
  {
    // Developer-only pages (demo and dev builds, never shown to members): English only.
    files: ['src/app/dev/**', 'src/app/settings/demo.tsx'],
    rules: {
      'design-system/no-hardcoded-copy': 'off',
    },
  },
  {
    // The only places allowed to touch raw values.
    files: ['src/theme/**', 'src/lib/platform.ts', 'src/components/primitives/Text.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
      'design-system/no-raw-sizes': 'off',
      'design-system/no-raw-colors': 'off',
    },
  },
  {
    // Node tooling: the page generator and these lint rules.
    files: ['scripts/**/*.js', 'eslint/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['**/*.test.{js,ts,tsx}', 'jest.setup.ts'],
    languageOptions: {
      globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly' },
    },
    rules: {
      'no-restricted-syntax': 'off',
      'design-system/no-raw-sizes': 'off',
      'design-system/no-raw-colors': 'off',
      'design-system/no-hardcoded-copy': 'off',
    },
  },
]);
