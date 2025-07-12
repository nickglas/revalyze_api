import Joi from "joi";

const envSchema = Joi.object({
  PORT: Joi.number().required(),
  MONGODB_URI: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  STRIPE_SUCCESS_URL: Joi.string().uri().required(),
  STRIPE_CANCEL_URL: Joi.string().uri().required(),
}).unknown();

export function validateEnv() {
  const { error } = envSchema.validate(process.env, { abortEarly: false });
  if (error) {
    throw new Error(
      `Config validation error: ${error.details
        .map((x) => x.message)
        .join(", ")}`
    );
  }
}
