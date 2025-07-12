import { validateEnv } from "../utils/validate.env";
import dotenv from "dotenv";

dotenv.config();

try {
  validateEnv();
  console.log("✅ Environment variables are valid.");
  process.exit(0);
} catch (err: any) {
  console.error("❌ Environment variables validation failed:");
  console.error(err.message);
  process.exit(1);
}
