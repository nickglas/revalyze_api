import cron, { ScheduledTask } from "node-cron";
import { Service } from "typedi";
import { StripeSyncService } from "../services/stripe.sync.service";
import { logger } from "../utils/logger";

@Service()
export class StripeSyncCron {
  private job?: ScheduledTask;
  private isRunning = false;

  constructor(private readonly stripeSyncService: StripeSyncService) {}

  public start() {
    if (this.job) {
      logger.info("Cron job already scheduled, skipping new schedule.");
      return;
    }

    logger.info("Scheduling cron job...");
    this.job = cron.schedule("* * * * *", async () => {
      if (this.isRunning) {
        logger.info("⚠️ Previous sync still running, skipping this run");
        return;
      }

      this.isRunning = true;
      logger.info("🔄 Starting Stripe sync...");
      try {
        await this.stripeSyncService.syncProducts();
        logger.info("✅ Sync complete");
      } catch (error) {
        logger.error("❌ Sync failed:", error);
      } finally {
        this.isRunning = false;
      }
    });
  }
}
