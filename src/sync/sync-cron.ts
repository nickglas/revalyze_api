import cron from "node-cron";
import { Service } from "typedi";
import { StripeSyncService } from "../services/stripe-sync.service";

@Service()
export class StripeSyncCron {
  constructor(private readonly stripeSyncService: StripeSyncService) {}

  public start() {
    // Run every minute
    cron.schedule("* * * * *", async () => {
      console.log("🔄 Starting Stripe sync...");
      try {
        await this.stripeSyncService.syncProducts();
        console.log("✅ Sync complete");
      } catch (error) {
        console.error("❌ Sync failed:", error);
      }
    });
  }
}
