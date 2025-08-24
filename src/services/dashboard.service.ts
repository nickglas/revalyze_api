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
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format,
  endOfDay,
} from "date-fns";
import { DailyReviewMetricModel } from "../models/entities/metrics/daily/daily.review.metric.entity";
import { ReviewModel } from "../models/entities/review.entity";
import mongoose, { mongo, Types } from "mongoose";
import { DailyCriterionMetricModel } from "../models/entities/metrics/daily/daily.criterion.metric.entity";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { UserRepository } from "../repositories/user.repository";
import { TranscriptRepository } from "../repositories/transcript.repository";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { DailyTeamMetricModel } from "../models/entities/metrics/daily/daily.team.metrics.entity";
import { logger } from "../utils/logger";
import { DailySentimentLabelMetricModel } from "../models/entities/metrics/daily/daily.sentiment.label.metric";
import { ReviewStatus } from "../models/types/transcript.type";
import { DashboardMetricModel } from "../models/entities/metrics/dashboard/dashboard.metric.entity";
import { DashboardSentimentMetricModel } from "../models/entities/metrics/dashboard/dashboard.sentiment.metric.entity";
import {
  DashboardTeamMetricModel,
  IDashboardTeamMetricPopulated,
} from "../models/entities/metrics/dashboard/dashboard.team.metric.entity";
import { DashboardCriterionMetricModel } from "../models/entities/metrics/dashboard/dashboard.criterion.metric.entity copy";
import { TeamModel } from "../models/entities/team.entity";

interface TeamMetricsResponse {
  teamId: string;
  teamName: string;
  avgOverall: number | null;
  avgSentiment: number | null;
  reviewCount: number;
  empathie: number | null;
  oplossingsgerichtheid: number | null;
  professionaliteit: number | null;
  klanttevredenheid: number | null;
  sentimentKlant: number | null;
  helderheidEnBegrijpelijkheid: number | null;
  responsiviteitLuistervaardigheid: number | null;
  tijdsefficientieDoelgerichtheid: number | null;
  data: {
    period: Date;
    avgOverall: number | null;
    avgSentiment: number | null;
    reviewCount: number;
  }[];
}

export interface TeamMetricDataPoint {
  date: Date;
  avgOverall: number | null;
  avgSentiment: number | null;
}

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
  ): Promise<TeamMetricsResponse[]> {
    // Calculate date range based on filter
    let startDate: Date;
    let endDate: Date = new Date();

    if (filter.toLowerCase() === "custom" && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      startDate = this.calculateStartDate(filter, endDate);
    }

    // Adjust for timezone issues - ensure we're working with UTC dates
    const utcStartDate = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate()
      )
    );

    const utcEndDate = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23,
        59,
        59,
        999 // End of day
      )
    );

    // Get all teams for this company
    const teams = await TeamModel.find({ companyId }).lean();

    // Get dashboard team metrics
    const dashboardMetrics = await DashboardTeamMetricModel.find({ companyId })
      .populate<{ team: { _id: mongoose.Types.ObjectId; name: string } }>(
        "team",
        "name"
      )
      .lean<IDashboardTeamMetricPopulated[]>();

    // Get time-series data with proper date handling
    const timeSeriesData = await DailyTeamMetricModel.aggregate([
      {
        $match: {
          companyId: companyId,
          date: {
            $gte: utcStartDate,
            $lte: utcEndDate,
          },
        },
      },
      {
        $group: {
          _id: {
            teamId: "$teamId",
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date",
                timezone: "UTC",
              },
            },
          },
          avgOverall: { $avg: "$avgOverall" },
          avgSentiment: { $avg: "$avgSentiment" },
          reviewCount: { $sum: "$reviewCount" },
        },
      },
      // ✅ Only keep dates that actually have reviews
      {
        $match: {
          reviewCount: { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 0,
          teamId: "$_id.teamId",
          date: {
            $dateFromString: {
              dateString: "$_id.date",
              timezone: "UTC",
            },
          },
          avgOverall: { $round: ["$avgOverall", 2] },
          avgSentiment: { $round: ["$avgSentiment", 2] },
          reviewCount: 1,
        },
      },
      {
        $sort: {
          teamId: 1,
          date: 1,
        },
      },
    ]);

    // Generate all dates in the range to fill in missing data
    const allDates = eachDayOfInterval({
      start: utcStartDate,
      end: utcEndDate,
    });

    // Combine data and fill in missing dates
    const result = dashboardMetrics.map((metric) => {
      const teamTimeSeries = timeSeriesData.filter(
        (d) => d.teamId.toString() === metric.teamId.toString()
      );

      // Create a map for quick lookup
      const dataMap = new Map();
      teamTimeSeries.forEach((item) => {
        dataMap.set(item.date.toISOString().split("T")[0], item);
      });

      // Fill in missing dates with null values
      const filledData = allDates
        .map((date) => {
          const dateKey = date.toISOString().split("T")[0];
          const existingData = dataMap.get(dateKey);

          return (
            existingData || {
              period: date,
              avgOverall: null,
              avgSentiment: null,
              reviewCount: 0,
            }
          );
        })
        .filter((item) => item.reviewCount > 0);

      return {
        teamId: metric.teamId.toString(),
        teamName: metric.team?.name || "Unknown Team",
        avgOverall: metric.avgOverall,
        avgSentiment: metric.avgSentiment,
        reviewCount: metric.reviewCount,
        empathie: metric.empathie,
        oplossingsgerichtheid: metric.oplossingsgerichtheid,
        professionaliteit: metric.professionaliteit,
        klanttevredenheid: metric.klanttevredenheid,
        sentimentKlant: metric.sentimentKlant,
        helderheidEnBegrijpelijkheid: metric.helderheidEnBegrijpelijkheid,
        responsiviteitLuistervaardigheid:
          metric.responsiviteitLuistervaardigheid,
        tijdsefficientieDoelgerichtheid: metric.tijdsefficientieDoelgerichtheid,
        data: filledData,
      };
    });

    return result;
  }

  private getDateRange(
    filter: string,
    customStartDate?: Date,
    customEndDate?: Date
  ): { startDate: Date; endDate: Date } {
    const endDate = customEndDate || new Date();
    let startDate: Date;

    switch (filter) {
      case "week":
        startDate = customStartDate || subWeeks(endDate, 1);
        break;
      case "month":
        startDate = customStartDate || subMonths(endDate, 1);
        break;
      case "year":
        startDate = customStartDate || subYears(endDate, 1);
        break;
      case "custom":
        if (!customStartDate) {
          throw new Error("Custom start date is required for custom filter");
        }
        startDate = customStartDate;
        break;
      default:
        startDate = subMonths(endDate, 1); // Default to 1 month
    }

    return { startDate, endDate };
  }

  private generateDateIntervals(
    startDate: Date,
    endDate: Date,
    interval: string
  ): Date[] {
    switch (interval) {
      case "day":
        return eachDayOfInterval({ start: startDate, end: endDate });
      case "week":
        return eachWeekOfInterval(
          { start: startDate, end: endDate },
          { weekStartsOn: 1 }
        );
      case "month":
        return eachMonthOfInterval({ start: startDate, end: endDate });
      case "year":
        return eachYearOfInterval({ start: startDate, end: endDate });
      default:
        return eachDayOfInterval({ start: startDate, end: endDate });
    }
  }

  private async getTeamMetricsForPeriod(
    companyId: mongoose.Types.ObjectId,
    teamId: mongoose.Types.ObjectId,
    startDate: Date,
    endDate: Date,
    interval: string
  ) {
    const matchStage: any = {
      companyId,
      teamId,
      date: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate),
      },
    };

    let groupStage: any;

    switch (interval) {
      case "day":
        groupStage = {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" },
          },
          date: { $first: "$date" },
          avgOverall: { $avg: "$avgOverall" },
          avgSentiment: { $avg: "$avgSentiment" },
        };
        break;
      case "week":
        groupStage = {
          _id: {
            year: { $year: "$date" },
            week: { $week: "$date" },
          },
          date: { $min: "$date" },
          avgOverall: { $avg: "$avgOverall" },
          avgSentiment: { $avg: "$avgSentiment" },
        };
        break;
      case "month":
        groupStage = {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          date: { $min: "$date" },
          avgOverall: { $avg: "$avgOverall" },
          avgSentiment: { $avg: "$avgSentiment" },
        };
        break;
      case "year":
        groupStage = {
          _id: { year: { $year: "$date" } },
          date: { $min: "$date" },
          avgOverall: { $avg: "$avgOverall" },
          avgSentiment: { $avg: "$avgSentiment" },
        };
        break;
    }

    return DailyTeamMetricModel.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { date: 1 } },
      { $project: { _id: 0, date: 1, avgOverall: 1, avgSentiment: 1 } },
    ]);
  }

  private isSameInterval(date1: Date, date2: Date, interval: string): boolean {
    switch (interval) {
      case "day":
        return format(date1, "yyyy-MM-dd") === format(date2, "yyyy-MM-dd");
      case "week":
        return format(date1, "yyyy-ww") === format(date2, "yyyy-ww");
      case "month":
        return format(date1, "yyyy-MM") === format(date2, "yyyy-MM");
      case "year":
        return format(date1, "yyyy") === format(date2, "yyyy");
      default:
        return date1.getTime() === date2.getTime();
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
