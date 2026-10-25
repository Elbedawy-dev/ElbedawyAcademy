export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 60000,
  collectCoverageFrom: ['src/**/*.js', '!src/seeds/**', '!src/server.js', '!src/docs/**'],
  verbose: true,
};
