// src/index.ts
import mongoose from "mongoose";
import app from "./app";
import dotenv from "dotenv";
import { Container } from "typedi";
import { StripeSyncCron } from "./sync/sync-cron";
import { logger } from "./utils/logger";
import { validateEnv } from "./utils/validate.env";
import { SeedService } from "./db/db.seed.service";
import { seedProducts } from "./db/db.seed.plans";
import { MetricsCron } from "./sync/metrics.cron";

dotenv.config();

// validateEnv();

const PORT = process.env.PORT || 4500;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env");
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    logger.info("Connected to MongoDB");

    // Seed database if in development and empty
    if (NODE_ENV === "development") {
      const seedService: SeedService = Container.get(SeedService);
      const isDatabaseEmpty = await seedService.isDatabaseEmpty();

      if (isDatabaseEmpty) {
        logger.info("Database is empty, starting seeding process");
        await seedService.seedFullEnvironment();
      } else {
        logger.info("Database already contains data, skipping seeding");
      }
    }

    // Start server
    app.listen(PORT, async () => {
      logger.info(
        `Server started in ${NODE_ENV} mode, running on http://localhost:${PORT}`
      );

      // Existing stripe product seeding
      const plans = await seedProducts();

      //get cron services
      const stripeSyncCron = Container.get(StripeSyncCron);
      const metricsCron = Container.get(MetricsCron);

      //start the services
      // stripeSyncCron.start();
      metricsCron.start();
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });
