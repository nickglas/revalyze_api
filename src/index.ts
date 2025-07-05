import mongoose from "mongoose";
import app from "./app";
import dotenv from "dotenv";
import { seedUsers } from "./db/db.seed.users";
import { CompanySeederService } from "./db/db.seed.companies";
import { seedProducts } from "./db/db.seed.plans";
import { Container } from "typedi";
import { StripeSyncCron } from "./sync/sync-cron";
import { logger } from "./utils/logger";

dotenv.config();

const PORT = process.env.PORT || 4500;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env");
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    logger.info("Connected to MongoDB");

    //Start server FIRST
    app.listen(PORT, async () => {
      logger.info(
        `Server started in ${process.env.NODE_ENV} mode, running on http://localhost:${PORT}`
      );

      //seeding stripe data
      const plans = await seedProducts();

      const companySeeder = Container.get(CompanySeederService);
      // const companies = await companySeeder.seedCompanies(plans);
      // await seedUsers(companies);

      //cron sync service
      const stripeSyncCron = Container.get(StripeSyncCron);
      // stripeSyncCron.start();
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });
