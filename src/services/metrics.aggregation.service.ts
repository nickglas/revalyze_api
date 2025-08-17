// src/services/metricsAggregation.service.ts
import { Service } from "typedi";
import { logger } from "../utils/logger";
import { ReviewModel } from "../models/entities/review.entity";
import { startOfDay, subDays } from "date-fns";

@Service()
export class MetricsAggregationService {
  async aggregateDailyMetrics() {
    const aggregationDate = startOfDay(subDays(new Date(), 1));
    await this.aggregateOverallMetrics(aggregationDate);
    await this.aggregateCriteriaMetrics(aggregationDate);
  }

  private async aggregateOverallMetrics(aggregationDate: Date) {
    await ReviewModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: aggregationDate,
            $lt: startOfDay(new Date()),
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
