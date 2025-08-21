// src/crons/metrics.cron.ts
import cron, { ScheduledTask } from "node-cron";
import { Service } from "typedi";
import { logger } from "../utils/logger";
import { MetricsAggregationService } from "../services/metrics.aggregation.service";

@Service()
export class MetricsCron {
  private dailyJob?: ScheduledTask;
  private hourlyJob?: ScheduledTask;

  constructor(private metricsService: MetricsAggregationService) {}

  start() {
    // Schedule daily aggregation at 2:00 AM
    if (!this.dailyJob) {
      this.dailyJob = cron.schedule("0 2 * * *", async () => {
        try {
          logger.info("Starting DAILY metrics aggregation...");
          await this.metricsService.aggregateDailyMetrics();
          logger.info("Daily metrics aggregation completed successfully");
        } catch (error) {
          logger.error("Daily metrics aggregation failed:", error);
        }
      });

      logger.info("✅ Daily metrics cron scheduled for 2:00 AM");
    } else {
      logger.info("ℹ️ Daily metrics cron already scheduled");
    }

    // Schedule hourly aggregation at the start of every hour
    if (!this.hourlyJob) {
      this.hourlyJob = cron.schedule("* * * * *", async () => {
        try {
          logger.info("Starting HOURLY metrics aggregation...");
          const now = new Date();
          await this.metricsService.aggregateDailyMetricsForEntities(now, {});
          await this.metricsService.updateDashboardMetrics();
          logger.info("Hourly metrics aggregation completed successfully");
        } catch (error) {
          logger.error("Hourly metrics aggregation failed:", error);
        }
      });

      logger.info(
        "✅ Hourly metrics cron scheduled for the start of every hour"
      );
    } else {
      logger.info("ℹ️ Hourly metrics cron already scheduled");
    }
  }

  stop() {
    if (this.dailyJob) {
      this.dailyJob.stop();
      logger.info("⏹️ Daily metrics cron stopped");
    }
    if (this.hourlyJob) {
      this.hourlyJob.stop();
      logger.info("⏹️ Hourly metrics cron stopped");
    }
  }
}
