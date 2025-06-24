import cron from "node-cron";
import { Service } from "typedi";
import { StripeSyncService } from "../services/stripe-sync.service";
import { logger } from "../utils/logger";

@Service()
export class StripeSyncCron {
  constructor(private readonly stripeSyncService: StripeSyncService) {}

  public start() {
    // Run every minute
    cron.schedule("* * * * *", async () => {
      logger.info("🔄 Starting Stripe sync...");
      try {
        await this.stripeSyncService.syncProducts();
        logger.info("✅ Sync complete");
      } catch (error) {
        logger.error("❌ Sync failed:", error);
      }
    });
  }
}
