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

    logger.info("Scheduling cron job for every 30 minutes...");
    this.job = cron.schedule("*/30 * * * *", async () => {
      if (this.isRunning) {
        logger.info("Previous sync still running, skipping this run");
        return;
      }

      this.isRunning = true;
      logger.info("Starting Stripe sync process...");
      try {
        await this.stripeSyncService.syncProducts();
        await this.stripeSyncService.syncPendingSubscriptions();
        await this.stripeSyncService.syncCompanies();
        await this.stripeSyncService.syncSubscriptions();
        logger.info("Stripe sync process complete");
      } catch (error) {
        logger.error("Stripe sync process failed:", error);
      } finally {
        this.isRunning = false;
      }
    });
  }
}
