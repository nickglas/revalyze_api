// src/services/dashboard.service.ts
import { Service } from "typedi";

import {
  startOfDay,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isWithinInterval,
  startOfMonth,
} from "date-fns";
import { DailyReviewMetricModel } from "../models/entities/daily.review.metric.entity";
import { ReviewModel } from "../models/entities/review.entity";
import mongoose, { Types } from "mongoose";
import { DailyCriterionMetricModel } from "../models/entities/daily.criterion.metric.entity";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { UserRepository } from "../repositories/user.repository";
import { TranscriptRepository } from "../repositories/transcript.repository";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { DailyTeamMetricModel } from "../models/entities/daily.team.metrics.entity";
import { logger } from "../utils/logger";
import { DailySentimentLabelMetricModel } from "../models/entities/daily.sentiment.label.metric";

@Service()
export class DashboardService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly userRepository: UserRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly reviewRepository: ReviewRepository
  ) {}

  async getMetrics(companyId: string, filter: string) {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (filter) {
      case "day":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = subWeeks(startOfDay(now), 1);
        break;
      case "month":
        startDate = subMonths(startOfDay(now), 1);
        break;
      case "year":
        startDate = subYears(startOfDay(now), 1);
        break;
      default:
        throw new Error("Invalid filter");
    }

    // Check if range is fully covered by pre-aggregated data
    const fullCoverage = !isWithinInterval(startDate, {
      start: startOfDay(subDays(now, 1)),
      end: now,
    });

    console.warn("ASDA");
    if (fullCoverage) {
      return this.getAggregatedMetrics(companyId, startDate, endDate);
    }
    console.warn("ASDA2");

    // Hybrid approach for recent data
    return this.getHybridMetrics(companyId, startDate, endDate);
  }

  private async getHybridMetrics(companyId: string, start: Date, end: Date) {
    const yesterday = startOfDay(subDays(new Date(), 1));

    // Pre-aggregated part
    const aggregated = await DailyReviewMetricModel.find({
      companyId,
      date: { $gte: start, $lte: yesterday },
    });

    // Real-time aggregation for recent period
    const recent = await ReviewModel.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          createdAt: { $gt: yesterday, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          avgOverall: { $avg: "$overallScore" },
          avgSentiment: { $avg: "$sentimentScore" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          date: yesterday,
        },
      },
    ]);

    return [
      ...aggregated,
      ...recent.map((r) => ({
        ...r,
        companyId,
        _id: null,
      })),
    ].sort((a, b) => a.date - b.date);
  }

  async getCriterionMetrics(
    companyId: string,
    criterionName: string,
    filter: string
  ) {
    const { startDate, endDate } = this.getDateRange(filter);
    return this.getCriterionData(companyId, criterionName, startDate, endDate);
  }

  async getCriteriaSummary(companyId: string, filter: string) {
    const { startDate, endDate } = this.getDateRange(filter);

    const currentData = await Promise.all(
      [
        "Empathie",
        "Oplossingsgerichtheid",
        "Professionaliteit",
        "Klanttevredenheid",
        "Sentiment klant",
        "Helderheid en begrijpelijkheid",
        "Responsiviteit/luistervaardigheid",
        "Tijdsefficiëntie/doelgerichtheid",
      ].map((name) =>
        this.getCriterionData(companyId, name, startDate, endDate).then(
          (data) => ({
            criterion: name,
            current: data[data.length - 1], // Most recent entry
            previous: data[0], // Oldest in period
          })
        )
      )
    );

    // 2. Calculate percentage changes
    return currentData.map(({ criterion, current, previous }) => ({
      criterion,
      currentScore: current?.avgScore || 0,
      changePercentage: this.calculateChange(
        current?.avgScore || 0,
        previous?.avgScore || 0
      ),
    }));
  }

  async getDashboardMetrics(companyId: string) {
    // 1. Get subscription details
    const subscription = await this.subscriptionRepository.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: "active",
    });

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // 2. Get active user count
    const activeUsers = await this.userRepository.countActiveUsersByCompany(
      companyId
    );

    // 3. Get transcript count for current billing period
    const transcripts = await this.transcriptRepository.count({
      companyId: new mongoose.Types.ObjectId(companyId),
      createdAt: {
        $gte: subscription.currentPeriodStart,
        $lte: subscription.currentPeriodEnd,
      },
    });

    // 4. Get review count for current billing period
    const reviews =
      await this.reviewRepository.countReviewsWithinPeriodByCompany(
        companyId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd
      );

    // 5. Get latest performance and sentiment scores
    const latestMetric = await DailyReviewMetricModel.findOne({ companyId })
      .sort({ date: -1 })
      .lean();

    return {
      users: {
        current: activeUsers,
        allowed: subscription.allowedUsers,
      },
      transcripts: {
        current: transcripts,
        allowed: subscription.allowedTranscripts,
      },
      reviews: {
        current: reviews,
        allowed: subscription.allowedReviews,
      },
      performance: latestMetric?.avgOverall || 0,
      sentiment: latestMetric?.avgSentiment || 0,
    };
  }

  /**
   * Get team metrics for bar chart (current month)
   * @param companyId - Company ID
   * @param period - Optional period (default: current month)
   */
  async getTeamMetrics(
    companyId: Types.ObjectId,
    period: Date = startOfMonth(new Date())
  ) {
    try {
      const monthStart = period;
      const monthEnd = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        1
      );

      return DailyTeamMetricModel.aggregate([
        {
          $lookup: {
            from: "teams",
            localField: "teamId",
            foreignField: "_id",
            as: "team",
            pipeline: [
              {
                $match: {
                  companyId,
                  isActive: true,
                },
              },
            ],
          },
        },
        { $unwind: { path: "$team", preserveNullAndEmptyArrays: false } },
        {
          $match: {
            date: {
              $gte: monthStart,
              $lt: monthEnd,
            },
          },
        },
        {
          $group: {
            _id: "$teamId",
            teamName: { $first: "$team.name" },
            avgOverall: { $avg: "$avgOverall" },
            avgSentiment: { $avg: "$avgSentiment" },
            reviewCount: { $sum: "$reviewCount" },
          },
        },
        {
          $project: {
            _id: 0,
            teamId: "$_id",
            teamName: 1,
            avgOverall: { $round: ["$avgOverall", 2] },
            avgSentiment: { $round: ["$avgSentiment", 2] },
            reviewCount: 1,
          },
        },
        { $sort: { teamName: 1 } },
      ]);
    } catch (error) {
      logger.error(`Failed to get team metrics: ${error}`);
      throw error;
    }
  }

  async getSentimentDistribution(days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));

    try {
      const results = await DailySentimentLabelMetricModel.aggregate([
        {
          $match: {
            date: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            negative: { $sum: "$negative" },
            neutral: { $sum: "$neutral" },
            positive: { $sum: "$positive" },
            total: { $sum: "$total" },
          },
        },
        {
          $project: {
            _id: 0,
            negative: 1,
            neutral: 1,
            positive: 1,
            total: 1,
            negativePercentage: {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$negative", "$total"] }, 100] },
              ],
            },
            neutralPercentage: {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$neutral", "$total"] }, 100] },
              ],
            },
            positivePercentage: {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$positive", "$total"] }, 100] },
              ],
            },
          },
        },
      ]);

      return (
        results[0] || {
          negative: 0,
          neutral: 0,
          positive: 0,
          total: 0,
          negativePercentage: 0,
          neutralPercentage: 0,
          positivePercentage: 0,
        }
      );
    } catch (error) {
      logger.error(`Failed to get sentiment distribution: ${error}`);
      throw error;
    }
  }

  async getSentimentTrends(days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));

    try {
      return DailySentimentLabelMetricModel.aggregate([
        {
          $match: {
            date: { $gte: startDate },
          },
        },
        {
          $project: {
            date: 1,
            negative: 1,
            neutral: 1,
            positive: 1,
            total: 1,
            negativePercentage: {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$negative", "$total"] }, 100] },
              ],
            },
            neutralPercentage: {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$neutral", "$total"] }, 100] },
              ],
            },
            positivePercentage: {
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$positive", "$total"] }, 100] },
              ],
            },
          },
        },
        { $sort: { date: 1 } },
      ]);
    } catch (error) {
      logger.error(`Failed to get sentiment trends: ${error}`);
      throw error;
    }
  }

  /**
   * Get historical team metrics for charts
   * @param teamId - Team ID
   * @param months - Number of months to retrieve
   */
  async getHistoricalTeamMetrics(teamId: Types.ObjectId, months: number = 6) {
    try {
      const endDate = startOfMonth(new Date());
      const startDate = subMonths(endDate, months - 1);

      return DailyTeamMetricModel.aggregate([
        {
          $match: {
            teamId,
            date: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$date" },
            },
            avgOverall: { $avg: "$avgOverall" },
            avgSentiment: { $avg: "$avgSentiment" },
            reviewCount: { $sum: "$reviewCount" },
          },
        },
        {
          $project: {
            _id: 0,
            period: "$_id",
            avgOverall: { $round: ["$avgOverall", 2] },
            avgSentiment: { $round: ["$avgSentiment", 2] },
            reviewCount: 1,
          },
        },
        { $sort: { period: 1 } },
      ]);
    } catch (error) {
      logger.error(`Failed to get historical team metrics: ${error}`);
      throw error;
    }
  }

  private calculateChange(current: number, previous: number): number {
    return previous
      ? Number((((current - previous) / previous) * 100).toFixed(1))
      : 0;
  }

  private async getCriterionData(
    companyId: string,
    criterionName: string,
    start: Date,
    end: Date
  ) {
    const fullCoverage = !isWithinInterval(start, {
      start: startOfDay(subDays(new Date(), 1)),
      end: new Date(),
    });

    if (fullCoverage) {
      return DailyCriterionMetricModel.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        criterionName,
        date: { $gte: start, $lte: end },
      }).sort({ date: 1 });
    }

    return this.getHybridCriterionData(companyId, criterionName, start, end);
  }

  private async getHybridCriterionData(
    companyId: string,
    criterionName: string,
    start: Date,
    end: Date
  ) {
    const yesterday = startOfDay(subDays(new Date(), 1));
    const objectId = new mongoose.Types.ObjectId(companyId);

    const aggregated = await DailyCriterionMetricModel.find({
      companyId: objectId,
      criterionName,
      date: { $gte: start, $lte: yesterday },
    });

    const recent = await ReviewModel.aggregate([
      {
        $match: {
          companyId: objectId,
          createdAt: { $gt: yesterday, $lte: end },
          "criteriaScores.criterionName": criterionName,
        },
      },
      { $unwind: "$criteriaScores" },
      {
        $match: {
          "criteriaScores.criterionName": criterionName,
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$criteriaScores.score" },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          date: yesterday,
          criterionName: criterionName,
          companyId: objectId,
        },
      },
    ]);

    return [
      ...aggregated,
      ...recent.map((r) => ({
        ...r,
        _id: null,
      })),
    ].sort((a, b) => a.date - b.date);
  }

  private getDateRange(filter: string) {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (filter) {
      case "day":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = subWeeks(startOfDay(now), 1);
        break;
      case "month":
        startDate = subMonths(startOfDay(now), 1);
        break;
      case "year":
        startDate = subYears(startOfDay(now), 1);
        break;
      default:
        throw new Error("Invalid filter");
    }

    return { startDate, endDate };
  }

  private async getAggregatedMetrics(
    companyId: string,
    start: Date,
    end: Date
  ) {
    console.warn(companyId);
    return await DailyReviewMetricModel.find({
      companyId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .exec();
  }
}
