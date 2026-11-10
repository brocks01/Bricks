// Extends jest-expo's transform allow-list (it already covers expo, react-navigation,
// standard-navigation, ...) with the two libraries we ship as source.
const preset = require('jest-expo/jest-preset');

const [expoPattern, ...restPatterns] = preset.transformIgnorePatterns;

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    expoPattern.replace(
      'standard-navigation',
      'standard-navigation|phosphor-react-native|react-native-svg',
    ),
    ...restPatterns,
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  // tsconfig points the icon paths at .d.ts files (types only); Jest needs the real source.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^phosphor-react-native/src/icons/(.*)$':
      '<rootDir>/node_modules/phosphor-react-native/src/icons/$1',
  },
};
