// src/crons/metrics.cron.ts
import cron, { ScheduledTask } from "node-cron";
import { Service } from "typedi";
import { logger } from "../utils/logger";
import { MetricsAggregationService } from "../services/metrics.aggregation.service";

@Service()
export class MetricsCron {
  private job?: ScheduledTask;

  constructor(private metricsService: MetricsAggregationService) {}

  start() {
    if (this.job) {
      logger.info("Metrics cron already scheduled");
      return;
    }

    // Run daily at 2:00 AM
    this.job = cron.schedule("0 2 * * *", async () => {
      try {
        logger.info("Starting daily metrics aggregation...");
        await this.metricsService.aggregateDailyMetrics();
        logger.info("Daily metrics aggregation completed");
      } catch (error) {
        logger.error("Metrics aggregation failed:", error);
      }
    });

    logger.info("Metrics cron scheduled for daily aggregation");
  }
}
