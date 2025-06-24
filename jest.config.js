module.exports = {
  preset: "ts-jest",
  silent: false,
  testEnvironment: "node",
  testMatch: ["**/src/test/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleNameMapper: {
    "^winston$": "<rootDir>/src/__mocks__/winston.ts",
  },
};
