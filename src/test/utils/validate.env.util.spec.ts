import { validateEnv } from "../../utils/validate.env";

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears the cache
    process.env = { ...originalEnv }; // clone to not pollute global
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validEnv = {
    PORT: "4500",
    MONGODB_URI: "mongodb://localhost:27017/mydb",
    JWT_SECRET: "supersecret",
    JWT_REFRESH_SECRET: "refreshsecret",
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_xyz",
    OPENAI_API_KEY: "sk-openai-123",
    STRIPE_SUCCESS_URL: "https://example.com/success",
    STRIPE_CANCEL_URL: "https://example.com/cancel",
  };

  it("should not throw when all required environment variables are set", () => {
    process.env = { ...process.env, ...validEnv };
    expect(() => validateEnv()).not.toThrow();
  });

  it("should throw if a required variable is missing", () => {
    const { STRIPE_SECRET_KEY, ...envWithoutStripe } = validEnv;
    process.env = { ...process.env, ...envWithoutStripe };

    expect(() => validateEnv()).toThrow(/"STRIPE_SECRET_KEY" is required/);
  });
});
