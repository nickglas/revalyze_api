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
import { DailyReviewMetricModel } from "../models/entities/metrics/daily.review.metric.entity";
import { ReviewModel } from "../models/entities/review.entity";
import mongoose, { mongo, Types } from "mongoose";
import { DailyCriterionMetricModel } from "../models/entities/metrics/daily.criterion.metric.entity";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { UserRepository } from "../repositories/user.repository";
import { TranscriptRepository } from "../repositories/transcript.repository";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { DailyTeamMetricModel } from "../models/entities/metrics/daily.team.metrics.entity";
import { logger } from "../utils/logger";
import { DailySentimentLabelMetricModel } from "../models/entities/metrics/daily.sentiment.label.metric";
import { ReviewStatus } from "../models/types/transcript.type";
import { DashboardMetricModel } from "../models/entities/metrics/dashboard.metric.entity";
import { DashboardSentimentMetricModel } from "../models/entities/metrics/dashboard.sentiment.metric.entity";
import { DashboardTeamMetricModel } from "../models/entities/metrics/dashboard.team.metric.entity";
import { DashboardCriterionMetricModel } from "../models/entities/metrics/dashboard.criterion.metric.entity copy";

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

    if (fullCoverage) {
      return this.getAggregatedMetrics(companyId, startDate, endDate);
    }

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
    const companyObjectId = new mongoose.Types.ObjectId(companyId);

    // Get all criteria metrics for the company
    const criteriaMetrics = await DashboardCriterionMetricModel.find({
      companyId: companyObjectId,
    }).lean();

    // Calculate date range based on filter
    const { startDate, endDate } = this.getDateRangeForFilter(filter);

    // Get trend data for the criteria
    const trendData = await DailyCriterionMetricModel.find({
      companyId: companyObjectId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1, criterionName: 1 })
      .lean();

    // Group trend data by criterion
    const trendByCriterion = trendData.reduce(
      (
        acc: Record<
          string,
          Array<{ date: Date; score: number; reviewCount: number }>
        >,
        item
      ) => {
        if (!acc[item.criterionName]) {
          acc[item.criterionName] = [];
        }
        acc[item.criterionName].push({
          date: item.date,
          score: item.avgScore,
          reviewCount: item.reviewCount,
        });
        return acc;
      },
      {}
    );

    // Format the response
    const summary = criteriaMetrics.map((metric) => ({
      criterionName: metric.criterionName,
      avgScore: metric.avgScore || 0,
      reviewCount: metric.reviewCount,
      trend: trendByCriterion[metric.criterionName] || [],
    }));

    return summary;
  }

  private getDateRangeForFilter(filter: string) {
    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      case "quarter":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }

    return { startDate, endDate: now };
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

    console.warn(subscription.currentPeriodStart);
    console.warn(subscription.currentPeriodEnd);

    // 4. Get review count for current billing period
    const reviews =
      await this.reviewRepository.countReviewsWithinPeriodByCompany(
        companyId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd
      );

    // 5. Get performance and sentiment scores
    const dashboardMetrics = await DashboardMetricModel.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
    }).lean();

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
      performance: dashboardMetrics?.avgOverall,
      sentiment: dashboardMetrics?.avgSentiment,
    };
  }

  /**
   * Get team metrics for dashboard with various time filters
   * @param companyId - Company ID
   * @param filter - Time period filter (year, month, week, day, custom)
   * @param customStartDate - Custom start date (for custom filter)
   * @param customEndDate - Custom end date (for custom filter)
   */
  async getTeamMetrics(
    companyId: mongoose.Types.ObjectId,
    filter: string = "month",
    customStartDate?: Date,
    customEndDate?: Date
  ) {
    // Calculate date range based on filter
    let startDate: Date;
    let endDate: Date = new Date();

    if (filter.toLowerCase() === "custom" && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      startDate = this.calculateStartDate(filter, endDate);
    }

    // Determine the date grouping interval based on the filter
    let dateGrouping: any;
    let periodFormat: any;

    switch (filter.toLowerCase()) {
      case "day":
        // 1 point per day
        dateGrouping = {
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" },
        };
        periodFormat = {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
          },
        };
        break;

      case "week":
        // 1 point per week
        dateGrouping = {
          year: { $year: "$date" },
          week: { $week: "$date" },
        };
        periodFormat = {
          $dateFromParts: {
            isoWeekYear: "$_id.year",
            isoWeek: "$_id.week",
            isoDayOfWeek: 1,
          },
        };
        break;

      case "month":
        // 1 point per month
        dateGrouping = {
          year: { $year: "$date" },
          month: { $month: "$date" },
        };
        periodFormat = {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: 1,
          },
        };
        break;

      case "year":
        // 1 point per year
        dateGrouping = {
          year: { $year: "$date" },
        };
        periodFormat = {
          $dateFromParts: {
            year: "$_id.year",
            month: 1,
            day: 1,
          },
        };
        break;

      case "custom":
        // For custom range, determine granularity based on date range
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff <= 7) {
          // Less than 7 days: daily granularity
          dateGrouping = {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          };
          periodFormat = {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
            },
          };
        } else if (daysDiff <= 30) {
          // 7-30 days: weekly granularity
          dateGrouping = {
            year: { $year: "$date" },
            week: { $week: "$date" },
          };
          periodFormat = {
            $dateFromParts: {
              isoWeekYear: "$_id.year",
              isoWeek: "$_id.week",
              isoDayOfWeek: 1,
            },
          };
        } else if (daysDiff <= 365) {
          // 30-365 days: monthly granularity
          dateGrouping = {
            year: { $year: "$date" },
            month: { $month: "$date" },
          };
          periodFormat = {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: 1,
            },
          };
        } else {
          // More than 365 days: yearly granularity
          dateGrouping = {
            year: { $year: "$date" },
          };
          periodFormat = {
            $dateFromParts: {
              year: "$_id.year",
              month: 1,
              day: 1,
            },
          };
        }
        break;

      default:
        // Default to monthly grouping
        dateGrouping = {
          year: { $year: "$date" },
          month: { $month: "$date" },
        };
        periodFormat = {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: 1,
          },
        };
    }

    const teamMetrics = await DailyTeamMetricModel.aggregate([
      {
        $match: {
          companyId: companyId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            teamId: "$teamId",
            ...dateGrouping,
          },
          date: { $first: "$date" },
          avgOverall: { $avg: "$avgOverall" },
          avgSentiment: { $avg: "$avgSentiment" },
          reviewCount: { $sum: "$reviewCount" },
          // Include all criteria fields in the aggregation
          empathie: { $avg: "$empathie" },
          oplossingsgerichtheid: { $avg: "$oplossingsgerichtheid" },
          professionaliteit: { $avg: "$professionaliteit" },
          klanttevredenheid: { $avg: "$klanttevredenheid" },
          sentimentKlant: { $avg: "$sentimentKlant" },
          helderheidEnBegrijpelijkheid: {
            $avg: "$helderheidEnBegrijpelijkheid",
          },
          responsiviteitLuistervaardigheid: {
            $avg: "$responsiviteitLuistervaardigheid",
          },
          tijdsefficientieDoelgerichtheid: {
            $avg: "$tijdsefficientieDoelgerichtheid",
          },
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id.teamId",
          foreignField: "_id",
          as: "team",
        },
      },
      {
        $unwind: "$team",
      },
      {
        $project: {
          _id: 0,
          teamId: "$_id.teamId",
          teamName: "$team.name",
          period: periodFormat,
          avgOverall: { $round: ["$avgOverall", 2] },
          avgSentiment: { $round: ["$avgSentiment", 2] },
          reviewCount: 1,
          empathie: { $round: ["$empathie", 2] },
          oplossingsgerichtheid: { $round: ["$oplossingsgerichtheid", 2] },
          professionaliteit: { $round: ["$professionaliteit", 2] },
          klanttevredenheid: { $round: ["$klanttevredenheid", 2] },
          sentimentKlant: { $round: ["$sentimentKlant", 2] },
          helderheidEnBegrijpelijkheid: {
            $round: ["$helderheidEnBegrijpelijkheid", 2],
          },
          responsiviteitLuistervaardigheid: {
            $round: ["$responsiviteitLuistervaardigheid", 2],
          },
          tijdsefficientieDoelgerichtheid: {
            $round: ["$tijdsefficientieDoelgerichtheid", 2],
          },
        },
      },
      {
        $sort: {
          teamName: 1,
          period: 1,
        },
      },
    ]);

    return teamMetrics;
  }

  private calculateStartDate(filter: string, endDate: Date): Date {
    const now = endDate;

    switch (filter.toLowerCase()) {
      case "day":
        return subDays(now, 1);
      case "week":
        return subWeeks(now, 1);
      case "month":
        return subMonths(now, 1);
      case "year":
        return subYears(now, 1);
      default:
        return subMonths(now, 1);
    }
  }

  async getSentimentDistribution(companyId: mongoose.Types.ObjectId) {
    try {
      return await DashboardSentimentMetricModel.findOne({
        companyId,
      });
    } catch (error) {
      logger.error(`Failed to get sentiment distribution: ${error}`);
      throw error;
    }
  }

  async getSentimentTrends(companyId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));

    try {
      return DailySentimentLabelMetricModel.aggregate([
        {
          $match: {
            companyId,
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
