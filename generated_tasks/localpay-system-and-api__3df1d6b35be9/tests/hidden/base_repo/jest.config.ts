import type { Config } from 'jest';

const config: Config = {
  // --------------------------------
  // Core
  // --------------------------------
  rootDir: '.',
  testEnvironment: 'node',

  moduleFileExtensions: ['js', 'json', 'ts'],

  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  // --------------------------------
  // Test discovery
  // --------------------------------
  testRegex: '.*\\.spec\\.ts$', // runs all .spec.ts files anywhere

  // --------------------------------
  // Coverage
  // --------------------------------
  collectCoverage: true,
  coverageDirectory: 'coverage',

  collectCoverageFrom: [
    'src/**/*.ts', // only source files
    '!src/main.ts', // bootstrap
    '!src/**/*.module.ts', // Nest modules
    '!src/**/*.dto.ts', // DTOs
    '!src/**/*.interface.ts', // interfaces
    '!src/**/*.enum.ts', // enums
  ],

  setupFiles: ['<rootDir>/test/jest-setup.ts'],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/', // 🚨 critical fix
    '/coverage/',
  ],

  coverageThreshold: {
    global: {
      branches: 45,
      functions: 45,
      lines: 54,
      statements: 55,
    },
  },

  // --------------------------------
  // Stability & clean tests
  // --------------------------------
  clearMocks: true,
  restoreMocks: true,

  // Helps catch async leaks (very useful in NestJS)
  detectOpenHandles: true,
};

export default config;
