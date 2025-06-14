module.exports = {
    preset: 'ts-jest',
    silent: false,
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    roots: ['<rootDir>/src', '<rootDir>/test'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  };
  