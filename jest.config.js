module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  silent: false,
  testMatch: ["**/test/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  roots: ["<rootDir>/src", "<rootDir>/src/test"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup/setupTestEnv.ts"],
  moduleNameMapper: {
    "^winston$": "<rootDir>/src/__mocks__/winston.ts",
  },
  verbose: true,
};
