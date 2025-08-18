// src/services/metricsAggregation.service.ts
import { Service } from "typedi";
import { logger } from "../utils/logger";
import { ReviewModel } from "../models/entities/review.entity";
import { startOfDay, subDays } from "date-fns";
import { ReviewStatus } from "../models/types/transcript.type";
import { DailyTeamMetricModel } from "../models/entities/daily.team.metrics.entity";
import { DailySentimentLabelMetricModel } from "../models/entities/daily.sentiment.label.metric";

@Service()
export class MetricsAggregationService {
  async aggregateDailyMetrics() {
    try {
      const aggregationDate = startOfDay(subDays(new Date(), 1));

      await Promise.all([
        this.aggregateOverallMetrics(aggregationDate),
        this.aggregateCriteriaMetrics(aggregationDate),
        this.aggregateTeamMetrics(aggregationDate),
        this.aggregateSentimentLabels(aggregationDate),
      ]);

      logger.info("Daily metrics aggregation completed successfully");
    } catch (error) {
      logger.error(`Daily metrics aggregation failed: ${error}`);
    }
  }

  private async aggregateSentimentLabels(aggregationDate: Date) {
    try {
      const sentimentAggregation = await ReviewModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: aggregationDate,
              $lt: startOfDay(new Date()),
            },
            reviewStatus: ReviewStatus.REVIEWED,
            isDeleted: false,
            sentimentLabel: { $in: ["negative", "neutral", "positive"] },
          },
        },
        {
          $group: {
            _id: "$sentimentLabel",
            count: { $sum: 1 },
          },
        },
      ]);

      const counts = {
        negative: 0,
        neutral: 0,
        positive: 0,
        total: 0,
      };

      sentimentAggregation.forEach((item) => {
        switch (item._id) {
          case "negative":
            counts.negative = item.count;
            break;
          case "neutral":
            counts.neutral = item.count;
            break;
          case "positive":
            counts.positive = item.count;
            break;
        }
      });

      counts.total = counts.negative + counts.neutral + counts.positive;

      await DailySentimentLabelMetricModel.findOneAndUpdate(
        { date: aggregationDate },
        {
          $set: {
            negative: counts.negative,
            neutral: counts.neutral,
            positive: counts.positive,
            total: counts.total,
          },
        },
        { upsert: true }
      );

      logger.info(
        `Aggregated sentiment labels for ${aggregationDate.toISOString()}: ${JSON.stringify(
          counts
        )}`
      );
    } catch (error) {
      logger.error(`Sentiment label aggregation failed: ${error}`);
      throw error;
    }
  }

  private async aggregateTeamMetrics(aggregationDate: Date) {
    try {
      const teamsWithReviews = await ReviewModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: aggregationDate,
              $lt: startOfDay(new Date()),
            },
            reviewStatus: ReviewStatus.REVIEWED,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$teamId",
            avgOverall: { $avg: "$overallScore" },
            avgSentiment: { $avg: "$sentimentScore" },
            reviewCount: { $sum: 1 },
          },
        },
      ]);

      if (teamsWithReviews.length === 0) {
        logger.info("No team reviews found for aggregation");
        return;
      }

      const operations = teamsWithReviews.map((teamData) => {
        const teamId = teamData._id;
        return {
          updateOne: {
            filter: { teamId, date: aggregationDate },
            update: {
              $set: {
                avgOverall: teamData.avgOverall || 0,
                avgSentiment: teamData.avgSentiment || 0,
                reviewCount: teamData.reviewCount,
              },
            },
            upsert: true,
          },
        };
      });

      await DailyTeamMetricModel.bulkWrite(operations);
      logger.info(`Aggregated metrics for ${teamsWithReviews.length} teams`);
    } catch (error) {
      logger.error(`Team metrics aggregation failed: ${error}`);
      throw error;
    }
  }

  private async aggregateOverallMetrics(aggregationDate: Date) {
    await ReviewModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: aggregationDate,
            $lt: startOfDay(new Date()),
            reviewStatus: ReviewStatus.REVIEWED,
          },
        },
      },
      {
        $group: {
          _id: {
            companyId: "$companyId",
            date: { $dateTrunc: { date: "$createdAt", unit: "day" } },
          },
          avgOverall: { $avg: "$overallScore" },
          avgSentiment: { $avg: "$sentimentScore" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $merge: {
          into: "dailyreviewmetrics",
          whenMatched: "replace",
          whenNotMatched: "insert",
        },
      },
    ]);
  }

  private async aggregateCriteriaMetrics(aggregationDate: Date) {
    await ReviewModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: aggregationDate,
            $lt: startOfDay(new Date()),
            reviewStatus: ReviewStatus.REVIEWED,
          },
        },
      },
      { $unwind: "$criteriaScores" },
      {
        $group: {
          _id: {
            companyId: "$companyId",
            criterionName: "$criteriaScores.criterionName",
            date: { $dateTrunc: { date: "$createdAt", unit: "day" } },
          },
          avgScore: { $avg: "$criteriaScores.score" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          companyId: "$_id.companyId",
          criterionName: "$_id.criterionName",
          date: "$_id.date",
          avgScore: 1,
          reviewCount: 1,
        },
      },
      {
        $merge: {
          into: "dailycriterionmetrics",
          whenMatched: "replace",
          whenNotMatched: "insert",
        },
      },
    ]);
  }
}
