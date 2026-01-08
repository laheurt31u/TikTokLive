/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', 'tests/**/*.spec.ts', 'tests/**/*.unit.spec.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
    '!app/**/*.d.ts',
    '!components/**/*.d.ts',
  ],
  setupFilesAfterEnv: [],
  transformIgnorePatterns: [
    'node_modules/(?!uuid|tiktok-live-connector|@jest)/'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};