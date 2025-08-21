import { Service } from "typedi";
import { logger } from "../utils/logger";
import { ReviewModel } from "../models/entities/review.entity";
import { startOfDay, addDays } from "date-fns";
import { ReviewStatus } from "../models/types/transcript.type";
import { DailyTeamMetricModel } from "../models/entities/metrics/daily.team.metrics.entity";
import mongoose from "mongoose";
import { DailyReviewMetricModel } from "../models/entities/metrics/daily.review.metric.entity";
import { DailyCriterionMetricModel } from "../models/entities/metrics/daily.criterion.metric.entity";
import { CompanyModel } from "../models/entities/company.entity";
import { DashboardMetricModel } from "../models/entities/metrics/dashboard.metric.entity";
import { CompanyRepository } from "../repositories/company.repository";
import pLimit from "p-limit";
import { DashboardCriterionMetricModel } from "../models/entities/metrics/dashboard.criterion.metric.entity copy";
import { DailySentimentLabelMetricModel } from "../models/entities/metrics/daily.sentiment.label.metric";
import { DashboardSentimentMetricModel } from "../models/entities/metrics/dashboard.sentiment.metric.entity";
import { DashboardTeamMetricModel } from "../models/entities/metrics/dashboard.team.metric.entity";

interface EntityContext {
  companyId?: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  contactId?: mongoose.Types.ObjectId;
  externalCompanyId?: mongoose.Types.ObjectId;
}

@Service()
export class MetricsAggregationService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  /**
   * Called nightly via cron → recalculates yesterday’s metrics for ALL companies.
   */
  async aggregateDailyMetrics(): Promise<void> {
    try {
      const date = startOfDay(new Date());
      await this.aggregateAllDailyMetrics(date);
      logger.info("Daily metrics aggregation completed successfully");
    } catch (error) {
      logger.error(`Daily metrics aggregation failed: ${error}`);
    }
  }

  /**
   * Called when recalculating metrics for a single entity or subset.
   */
  async aggregateDailyMetricsForEntities(date: Date, entities: EntityContext) {
    const baseMatch = this.buildBaseMatch(date, entities);
    const sanitizedEntities = this.sanitizeEntities(entities);

    await Promise.all([
      this.aggregateOverallMetrics(baseMatch, sanitizedEntities, date),
      this.aggregateCriteriaMetrics(baseMatch, sanitizedEntities, date),
      this.aggregateTeamMetrics(baseMatch, sanitizedEntities, date),
      this.aggregateSentimentLabels(baseMatch, sanitizedEntities, date),
    ]);
  }

  /**
   * Full daily aggregation for all companies → used for nightly and hourly jobs.
   */
  async aggregateAllDailyMetrics(date: Date) {
    const companies = await CompanyModel.find({}, "_id");

    for (const company of companies) {
      await this.aggregateDailyMetricsForEntities(date, {
        companyId: company._id,
      });
    }
  }

  async updateSentimentLabelMetricsForCompany(
    companyId: mongoose.Types.ObjectId
  ) {
    const sentimentResult = await ReviewModel.aggregate([
      {
        $match: {
          companyId: companyId,
          reviewStatus: ReviewStatus.REVIEWED,
          type: { $in: ["sentiment", "both"] },
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

    const counts = { negative: 0, neutral: 0, positive: 0, total: 0 };
    for (const row of sentimentResult) {
      counts[row._id as keyof typeof counts] = row.count;
    }
    counts.total = counts.negative + counts.neutral + counts.positive;

    await DashboardSentimentMetricModel.findOneAndUpdate(
      { companyId: companyId },
      {
        $set: {
          negative: counts.negative,
          neutral: counts.neutral,
          positive: counts.positive,
          total: counts.total,
          negativePercentage:
            counts.total > 0
              ? parseFloat(((counts.negative / counts.total) * 100).toFixed(1))
              : 0,
          neutralPercentage:
            counts.total > 0
              ? parseFloat(((counts.neutral / counts.total) * 100).toFixed(1))
              : 0,
          positivePercentage:
            counts.total > 0
              ? parseFloat(((counts.positive / counts.total) * 100).toFixed(1))
              : 0,
        },
      },
      { upsert: true }
    );
  }

  async updateDashboardMetrics() {
    const activeCompanies = await this.companyRepository.find({
      isActive: true,
    });

    // Use a concurrency limit
    const limit = pLimit(5);

    await Promise.all([
      this.updateSentimentLabelMetrics(),
      this.updateTeamMetrics(),
      ...activeCompanies.map((c) =>
        limit(async () => {
          try {
            // Calculate overall performance average
            const performanceResult = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["performance", "both"] },
                  overallScore: { $exists: true, $ne: null, $gt: 0 },
                },
              },
              {
                $group: {
                  _id: null,
                  avgPerformance: { $avg: "$overallScore" },
                  count: { $sum: 1 },
                },
              },
            ]);

            // Calculate overall sentiment average
            const sentimentResult = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["sentiment", "both"] },
                  sentimentScore: { $exists: true, $ne: null, $gt: 0 },
                },
              },
              {
                $group: {
                  _id: null,
                  avgSentiment: { $avg: "$sentimentScore" },
                  count: { $sum: 1 },
                },
              },
            ]);

            // Calculate criterion averages
            const criterionResult = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["performance", "both"] },
                  criteriaScores: { $exists: true, $not: { $size: 0 } },
                },
              },
              { $unwind: "$criteriaScores" },
              {
                $group: {
                  _id: "$criteriaScores.criterionName",
                  avgScore: { $avg: "$criteriaScores.score" },
                  reviewCount: { $sum: 1 },
                },
              },
            ]);

            // Get total review count
            const totalResult = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                },
              },
              {
                $group: {
                  _id: null,
                  totalCount: { $sum: 1 },
                },
              },
            ]);

            // Update dashboard metrics
            await DashboardMetricModel.findOneAndUpdate(
              { companyId: c._id },
              {
                $set: {
                  avgOverall:
                    performanceResult.length > 0
                      ? performanceResult[0].avgPerformance
                      : null,
                  avgSentiment:
                    sentimentResult.length > 0
                      ? sentimentResult[0].avgSentiment
                      : null,
                  performanceReviewCount:
                    performanceResult.length > 0
                      ? performanceResult[0].count
                      : 0,
                  sentimentReviewCount:
                    sentimentResult.length > 0 ? sentimentResult[0].count : 0,
                  totalReviewCount:
                    totalResult.length > 0 ? totalResult[0].totalCount : 0,
                },
              },
              { upsert: true }
            );

            // Update criterion metrics
            if (criterionResult.length > 0) {
              const bulkOps = criterionResult.map((criterion) => ({
                updateOne: {
                  filter: {
                    companyId: c._id,
                    criterionName: criterion._id,
                  },
                  update: {
                    $set: {
                      avgScore: criterion.avgScore,
                      reviewCount: criterion.reviewCount,
                    },
                  },
                  upsert: true,
                },
              }));

              await DashboardCriterionMetricModel.bulkWrite(bulkOps);
            }
          } catch (error) {
            console.error(
              `Error updating metrics for company ${c._id}:`,
              error
            );
          }
        })
      ),
    ]);
  }

  async updateTeamMetricsForCompany(companyId: mongoose.Types.ObjectId) {
    // Define the actual criteria
    const defaultCriteria = [
      "Empathie",
      "Oplossingsgerichtheid",
      "Professionaliteit",
      "Klanttevredenheid",
      "Sentiment klant",
      "Helderheid en begrijpelijkheid",
      "Responsiviteit/luistervaardigheid",
      "Tijdsefficiëntie/doelgerichtheid",
    ];

    // Calculate team metrics with type filtering
    const overallResults = await ReviewModel.aggregate([
      {
        $match: {
          companyId: companyId,
          reviewStatus: ReviewStatus.REVIEWED,
          type: { $in: ["performance", "both"] },
          teamId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$teamId",
          avgOverall: { $avg: "$overallScore" },
          reviewCountOverall: { $sum: 1 },
        },
      },
    ]);

    const sentimentResults = await ReviewModel.aggregate([
      {
        $match: {
          companyId: companyId,
          reviewStatus: ReviewStatus.REVIEWED,
          type: { $in: ["sentiment", "both"] },
          teamId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$teamId",
          avgSentiment: { $avg: "$sentimentScore" },
          reviewCountSentiment: { $sum: 1 },
        },
      },
    ]);

    // Aggregate criteria scores
    const criteriaResults = await ReviewModel.aggregate([
      {
        $match: {
          companyId: companyId,
          reviewStatus: ReviewStatus.REVIEWED,
          type: { $in: ["performance", "both"] },
          teamId: { $ne: null },
          criteriaScores: { $exists: true, $not: { $size: 0 } },
        },
      },
      { $unwind: "$criteriaScores" },
      {
        $match: {
          "criteriaScores.criterionName": { $in: defaultCriteria },
        },
      },
      {
        $group: {
          _id: {
            teamId: "$teamId",
            criterionName: "$criteriaScores.criterionName",
          },
          avgScore: { $avg: "$criteriaScores.score" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    // Merge the results (similar to aggregateTeamMetrics)
    const teamMetrics = new Map();

    // Initialize with overall and sentiment results
    overallResults.forEach((result) => {
      if (result._id) {
        teamMetrics.set(result._id.toString(), {
          avgOverall: result.avgOverall || 0,
          reviewCount: result.reviewCountOverall || 0,
          // Initialize all criteria to null
          empathie: null,
          oplossingsgerichtheid: null,
          professionaliteit: null,
          klanttevredenheid: null,
          sentimentKlant: null,
          helderheidEnBegrijpelijkheid: null,
          responsiviteitLuistervaardigheid: null,
          tijdsefficientieDoelgerichtheid: null,
        });
      }
    });

    sentimentResults.forEach((result) => {
      if (result._id) {
        const teamId = result._id.toString();
        if (teamMetrics.has(teamId)) {
          const metrics = teamMetrics.get(teamId);
          metrics.avgSentiment = result.avgSentiment || 0;
        } else {
          teamMetrics.set(teamId, {
            avgOverall: 0,
            avgSentiment: result.avgSentiment || 0,
            reviewCount: result.reviewCountSentiment || 0,
            // Initialize all criteria to null
            empathie: null,
            oplossingsgerichtheid: null,
            professionaliteit: null,
            klanttevredenheid: null,
            sentimentKlant: null,
            helderheidEnBegrijpelijkheid: null,
            responsiviteitLuistervaardigheid: null,
            tijdsefficientieDoelgerichtheid: null,
          });
        }
      }
    });

    // Add criteria results
    criteriaResults.forEach((result) => {
      if (result._id.teamId) {
        const teamId = result._id.teamId.toString();
        const criterionName = result._id.criterionName;

        // Map the criterion name to the schema field name
        let fieldName;
        switch (criterionName) {
          case "Empathie":
            fieldName = "empathie";
            break;
          case "Oplossingsgerichtheid":
            fieldName = "oplossingsgerichtheid";
            break;
          case "Professionaliteit":
            fieldName = "professionaliteit";
            break;
          case "Klanttevredenheid":
            fieldName = "klanttevredenheid";
            break;
          case "Sentiment klant":
            fieldName = "sentimentKlant";
            break;
          case "Helderheid en begrijpelijkheid":
            fieldName = "helderheidEnBegrijpelijkheid";
            break;
          case "Responsiviteit/luistervaardigheid":
            fieldName = "responsiviteitLuistervaardigheid";
            break;
          case "Tijdsefficiëntie/doelgerichtheid":
            fieldName = "tijdsefficientieDoelgerichtheid";
            break;
          default:
            return; // Skip unknown criteria
        }

        if (teamMetrics.has(teamId)) {
          const metrics = teamMetrics.get(teamId);
          metrics[fieldName] = result.avgScore || 0;
        } else {
          // Create a new entry if team not already in map
          const metrics = {
            avgOverall: 0,
            avgSentiment: 0,
            reviewCount: result.reviewCount || 0,
            // Initialize all criteria to null
            empathie: null,
            oplossingsgerichtheid: null,
            professionaliteit: null,
            klanttevredenheid: null,
            sentimentKlant: null,
            helderheidEnBegrijpelijkheid: null,
            responsiviteitLuistervaardigheid: null,
            tijdsefficientieDoelgerichtheid: null,
          };
          metrics[fieldName] = result.avgScore || 0;
          teamMetrics.set(teamId, metrics);
        }
      }
    });

    if (teamMetrics.size === 0) return;

    // Update dashboard team metrics
    const ops = Array.from(teamMetrics.entries()).map(([teamId, metrics]) => ({
      updateOne: {
        filter: {
          companyId: companyId,
          teamId: new mongoose.Types.ObjectId(teamId),
        },
        update: {
          $set: {
            avgOverall: metrics.avgOverall,
            avgSentiment: metrics.avgSentiment,
            reviewCount: metrics.reviewCount,
            empathie: metrics.empathie,
            oplossingsgerichtheid: metrics.oplossingsgerichtheid,
            professionaliteit: metrics.professionaliteit,
            klanttevredenheid: metrics.klanttevredenheid,
            sentimentKlant: metrics.sentimentKlant,
            helderheidEnBegrijpelijkheid: metrics.helderheidEnBegrijpelijkheid,
            responsiviteitLuistervaardigheid:
              metrics.responsiviteitLuistervaardigheid,
            tijdsefficientieDoelgerichtheid:
              metrics.tijdsefficientieDoelgerichtheid,
          },
        },
        upsert: true,
      },
    }));

    await DashboardTeamMetricModel.bulkWrite(ops);
  }

  private async updateTeamMetrics() {
    const activeCompanies = await this.companyRepository.find({
      isActive: true,
    });

    const limit = pLimit(5);

    await Promise.all(
      activeCompanies.map((c) =>
        limit(async () => {
          try {
            // Define the actual criteria
            const defaultCriteria = [
              "Empathie",
              "Oplossingsgerichtheid",
              "Professionaliteit",
              "Klanttevredenheid",
              "Sentiment klant",
              "Helderheid en begrijpelijkheid",
              "Responsiviteit/luistervaardigheid",
              "Tijdsefficiëntie/doelgerichtheid",
            ];

            // Calculate team metrics with type filtering
            const overallResults = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["performance", "both"] },
                  teamId: { $ne: null },
                },
              },
              {
                $group: {
                  _id: "$teamId",
                  avgOverall: { $avg: "$overallScore" },
                  reviewCountOverall: { $sum: 1 },
                },
              },
            ]);

            const sentimentResults = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["sentiment", "both"] },
                  teamId: { $ne: null },
                },
              },
              {
                $group: {
                  _id: "$teamId",
                  avgSentiment: { $avg: "$sentimentScore" },
                  reviewCountSentiment: { $sum: 1 },
                },
              },
            ]);

            // Aggregate criteria scores
            const criteriaResults = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["performance", "both"] },
                  teamId: { $ne: null },
                  criteriaScores: { $exists: true, $not: { $size: 0 } },
                },
              },
              { $unwind: "$criteriaScores" },
              {
                $match: {
                  "criteriaScores.criterionName": { $in: defaultCriteria },
                },
              },
              {
                $group: {
                  _id: {
                    teamId: "$teamId",
                    criterionName: "$criteriaScores.criterionName",
                  },
                  avgScore: { $avg: "$criteriaScores.score" },
                  reviewCount: { $sum: 1 },
                },
              },
            ]);

            // Merge the results
            const teamMetrics = new Map();

            // Initialize with overall and sentiment results
            overallResults.forEach((result) => {
              if (result._id) {
                teamMetrics.set(result._id.toString(), {
                  avgOverall: result.avgOverall || 0,
                  reviewCount: result.reviewCountOverall || 0,
                  // Initialize all criteria to null
                  empathie: null,
                  oplossingsgerichtheid: null,
                  professionaliteit: null,
                  klanttevredenheid: null,
                  sentimentKlant: null,
                  helderheidEnBegrijpelijkheid: null,
                  responsiviteitLuistervaardigheid: null,
                  tijdsefficientieDoelgerichtheid: null,
                });
              }
            });

            sentimentResults.forEach((result) => {
              if (result._id) {
                const teamId = result._id.toString();
                if (teamMetrics.has(teamId)) {
                  const metrics = teamMetrics.get(teamId);
                  metrics.avgSentiment = result.avgSentiment || 0;
                } else {
                  teamMetrics.set(teamId, {
                    avgOverall: 0,
                    avgSentiment: result.avgSentiment || 0,
                    reviewCount: result.reviewCountSentiment || 0,
                    // Initialize all criteria to null
                    empathie: null,
                    oplossingsgerichtheid: null,
                    professionaliteit: null,
                    klanttevredenheid: null,
                    sentimentKlant: null,
                    helderheidEnBegrijpelijkheid: null,
                    responsiviteitLuistervaardigheid: null,
                    tijdsefficientieDoelgerichtheid: null,
                  });
                }
              }
            });

            // Add criteria results
            criteriaResults.forEach((result) => {
              if (result._id.teamId) {
                const teamId = result._id.teamId.toString();
                const criterionName = result._id.criterionName;

                // Map the criterion name to the schema field name
                let fieldName;
                switch (criterionName) {
                  case "Empathie":
                    fieldName = "empathie";
                    break;
                  case "Oplossingsgerichtheid":
                    fieldName = "oplossingsgerichtheid";
                    break;
                  case "Professionaliteit":
                    fieldName = "professionaliteit";
                    break;
                  case "Klanttevredenheid":
                    fieldName = "klanttevredenheid";
                    break;
                  case "Sentiment klant":
                    fieldName = "sentimentKlant";
                    break;
                  case "Helderheid en begrijpelijkheid":
                    fieldName = "helderheidEnBegrijpelijkheid";
                    break;
                  case "Responsiviteit/luistervaardigheid":
                    fieldName = "responsiviteitLuistervaardigheid";
                    break;
                  case "Tijdsefficiëntie/doelgerichtheid":
                    fieldName = "tijdsefficientieDoelgerichtheid";
                    break;
                  default:
                    return; // Skip unknown criteria
                }

                if (teamMetrics.has(teamId)) {
                  const metrics = teamMetrics.get(teamId);
                  metrics[fieldName] = result.avgScore || 0;
                } else {
                  // Create a new entry if team not already in map
                  const metrics = {
                    avgOverall: 0,
                    avgSentiment: 0,
                    reviewCount: result.reviewCount || 0,
                    // Initialize all criteria to null
                    empathie: null,
                    oplossingsgerichtheid: null,
                    professionaliteit: null,
                    klanttevredenheid: null,
                    sentimentKlant: null,
                    helderheidEnBegrijpelijkheid: null,
                    responsiviteitLuistervaardigheid: null,
                    tijdsefficientieDoelgerichtheid: null,
                  };
                  metrics[fieldName] = result.avgScore || 0;
                  teamMetrics.set(teamId, metrics);
                }
              }
            });

            if (teamMetrics.size === 0) return;

            // Update dashboard team metrics
            const ops = Array.from(teamMetrics.entries()).map(
              ([teamId, metrics]) => ({
                updateOne: {
                  filter: {
                    companyId: c._id,
                    teamId: new mongoose.Types.ObjectId(teamId),
                  },
                  update: {
                    $set: {
                      avgOverall: metrics.avgOverall,
                      avgSentiment: metrics.avgSentiment,
                      reviewCount: metrics.reviewCount,
                      empathie: metrics.empathie,
                      oplossingsgerichtheid: metrics.oplossingsgerichtheid,
                      professionaliteit: metrics.professionaliteit,
                      klanttevredenheid: metrics.klanttevredenheid,
                      sentimentKlant: metrics.sentimentKlant,
                      helderheidEnBegrijpelijkheid:
                        metrics.helderheidEnBegrijpelijkheid,
                      responsiviteitLuistervaardigheid:
                        metrics.responsiviteitLuistervaardigheid,
                      tijdsefficientieDoelgerichtheid:
                        metrics.tijdsefficientieDoelgerichtheid,
                    },
                  },
                  upsert: true,
                },
              })
            );

            await DashboardTeamMetricModel.bulkWrite(ops);
          } catch (error) {
            console.error(
              `Error updating team metrics for company ${c._id}:`,
              error
            );
          }
        })
      )
    );
  }
  // ------------------------------------------------------------
  //  Aggregation Implementations
  // ------------------------------------------------------------

  private async aggregateSentimentLabels(
    baseMatch: any,
    entities: EntityContext,
    date: Date
  ) {
    const results = await ReviewModel.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: "$sentimentLabel",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = { negative: 0, neutral: 0, positive: 0, total: 0 };
    for (const row of results) {
      counts[row._id as "negative" | "neutral" | "positive"] = row.count;
    }
    counts.total = counts.negative + counts.neutral + counts.positive;

    if (counts.total === 0) {
      await DailySentimentLabelMetricModel.deleteOne({ date, ...entities });
      return;
    }

    await DailySentimentLabelMetricModel.findOneAndUpdate(
      { date, ...this.filterMetricEntities(entities) },
      { $set: counts },
      { upsert: true }
    );
  }

  private async updateSentimentLabelMetrics() {
    const activeCompanies = await this.companyRepository.find({
      isActive: true,
    });

    const limit = pLimit(5);

    await Promise.all(
      activeCompanies.map((c) =>
        limit(async () => {
          try {
            const sentimentResult = await ReviewModel.aggregate([
              {
                $match: {
                  companyId: c._id,
                  reviewStatus: ReviewStatus.REVIEWED,
                  type: { $in: ["sentiment", "both"] },
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

            const counts = { negative: 0, neutral: 0, positive: 0, total: 0 };
            for (const row of sentimentResult) {
              counts[row._id as keyof typeof counts] = row.count;
            }
            counts.total = counts.negative + counts.neutral + counts.positive;

            await DashboardSentimentMetricModel.findOneAndUpdate(
              { companyId: c._id },
              {
                $set: {
                  negative: counts.negative,
                  neutral: counts.neutral,
                  positive: counts.positive,
                  total: counts.total,
                  negativePercentage:
                    counts.total > 0
                      ? parseFloat(
                          ((counts.negative / counts.total) * 100).toFixed(1)
                        )
                      : 0,
                  neutralPercentage:
                    counts.total > 0
                      ? parseFloat(
                          ((counts.neutral / counts.total) * 100).toFixed(1)
                        )
                      : 0,
                  positivePercentage:
                    counts.total > 0
                      ? parseFloat(
                          ((counts.positive / counts.total) * 100).toFixed(1)
                        )
                      : 0,
                },
              },
              { upsert: true }
            );
          } catch (error) {
            console.error(
              `Error updating sentiment metrics for company ${c._id}:`,
              error
            );
          }
        })
      )
    );
  }

  private async aggregateTeamMetrics(
    baseMatch: any,
    entities: EntityContext,
    date: Date
  ) {
    // Define the actual criteria
    const defaultCriteria = [
      "Empathie",
      "Oplossingsgerichtheid",
      "Professionaliteit",
      "Klanttevredenheid",
      "Sentiment klant",
      "Helderheid en begrijpelijkheid",
      "Responsiviteit/luistervaardigheid",
      "Tijdsefficiëntie/doelgerichtheid",
    ];

    // Calculate team metrics with type filtering
    const overallResults = await ReviewModel.aggregate([
      {
        $match: {
          ...baseMatch,
          type: { $in: ["performance", "both"] },
          teamId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$teamId",
          avgOverall: { $avg: "$overallScore" },
          reviewCountOverall: { $sum: 1 },
        },
      },
    ]);

    const sentimentResults = await ReviewModel.aggregate([
      {
        $match: {
          ...baseMatch,
          type: { $in: ["sentiment", "both"] },
          teamId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$teamId",
          avgSentiment: { $avg: "$sentimentScore" },
          reviewCountSentiment: { $sum: 1 },
        },
      },
    ]);

    // Aggregate criteria scores
    const criteriaResults = await ReviewModel.aggregate([
      {
        $match: {
          ...baseMatch,
          type: { $in: ["performance", "both"] },
          teamId: { $ne: null },
          criteriaScores: { $exists: true, $not: { $size: 0 } },
        },
      },
      { $unwind: "$criteriaScores" },
      {
        $match: {
          "criteriaScores.criterionName": { $in: defaultCriteria },
        },
      },
      {
        $group: {
          _id: {
            teamId: "$teamId",
            criterionName: "$criteriaScores.criterionName",
          },
          avgScore: { $avg: "$criteriaScores.score" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    // Merge the results
    const teamMetrics = new Map();

    // Initialize with overall and sentiment results
    overallResults.forEach((result) => {
      if (result._id) {
        teamMetrics.set(result._id.toString(), {
          avgOverall: result.avgOverall || 0,
          reviewCount: result.reviewCountOverall || 0,
          // Initialize all criteria to null
          empathie: null,
          oplossingsgerichtheid: null,
          professionaliteit: null,
          klanttevredenheid: null,
          sentimentKlant: null,
          helderheidEnBegrijpelijkheid: null,
          responsiviteitLuistervaardigheid: null,
          tijdsefficientieDoelgerichtheid: null,
        });
      }
    });

    sentimentResults.forEach((result) => {
      if (result._id) {
        const teamId = result._id.toString();
        if (teamMetrics.has(teamId)) {
          const metrics = teamMetrics.get(teamId);
          metrics.avgSentiment = result.avgSentiment || 0;
        } else {
          teamMetrics.set(teamId, {
            avgOverall: 0,
            avgSentiment: result.avgSentiment || 0,
            reviewCount: result.reviewCountSentiment || 0,
            // Initialize all criteria to null
            empathie: null,
            oplossingsgerichtheid: null,
            professionaliteit: null,
            klanttevredenheid: null,
            sentimentKlant: null,
            helderheidEnBegrijpelijkheid: null,
            responsiviteitLuistervaardigheid: null,
            tijdsefficientieDoelgerichtheid: null,
          });
        }
      }
    });

    // Add criteria results
    criteriaResults.forEach((result) => {
      if (result._id.teamId) {
        const teamId = result._id.teamId.toString();
        const criterionName = result._id.criterionName;

        // Map the criterion name to the schema field name
        let fieldName;
        switch (criterionName) {
          case "Empathie":
            fieldName = "empathie";
            break;
          case "Oplossingsgerichtheid":
            fieldName = "oplossingsgerichtheid";
            break;
          case "Professionaliteit":
            fieldName = "professionaliteit";
            break;
          case "Klanttevredenheid":
            fieldName = "klanttevredenheid";
            break;
          case "Sentiment klant":
            fieldName = "sentimentKlant";
            break;
          case "Helderheid en begrijpelijkheid":
            fieldName = "helderheidEnBegrijpelijkheid";
            break;
          case "Responsiviteit/luistervaardigheid":
            fieldName = "responsiviteitLuistervaardigheid";
            break;
          case "Tijdsefficiëntie/doelgerichtheid":
            fieldName = "tijdsefficientieDoelgerichtheid";
            break;
          default:
            return; // Skip unknown criteria
        }

        if (teamMetrics.has(teamId)) {
          const metrics = teamMetrics.get(teamId);
          metrics[fieldName] = result.avgScore || 0;
        } else {
          // Create a new entry if team not already in map
          const metrics = {
            avgOverall: 0,
            avgSentiment: 0,
            reviewCount: result.reviewCount || 0,
            // Initialize all criteria to null
            empathie: null,
            oplossingsgerichtheid: null,
            professionaliteit: null,
            klanttevredenheid: null,
            sentimentKlant: null,
            helderheidEnBegrijpelijkheid: null,
            responsiviteitLuistervaardigheid: null,
            tijdsefficientieDoelgerichtheid: null,
          };
          metrics[fieldName] = result.avgScore || 0;
          teamMetrics.set(teamId, metrics);
        }
      }
    });

    if (teamMetrics.size === 0) {
      await DailyTeamMetricModel.deleteMany({ date, ...entities });
      return;
    }

    const ops = Array.from(teamMetrics.entries()).map(([teamId, metrics]) => ({
      updateOne: {
        filter: {
          teamId: new mongoose.Types.ObjectId(teamId),
          date,
          ...this.filterMetricEntities(entities),
        },
        update: {
          $set: {
            avgOverall: metrics.avgOverall,
            avgSentiment: metrics.avgSentiment,
            reviewCount: metrics.reviewCount,
            empathie: metrics.empathie,
            oplossingsgerichtheid: metrics.oplossingsgerichtheid,
            professionaliteit: metrics.professionaliteit,
            klanttevredenheid: metrics.klanttevredenheid,
            sentimentKlant: metrics.sentimentKlant,
            helderheidEnBegrijpelijkheid: metrics.helderheidEnBegrijpelijkheid,
            responsiviteitLuistervaardigheid:
              metrics.responsiviteitLuistervaardigheid,
            tijdsefficientieDoelgerichtheid:
              metrics.tijdsefficientieDoelgerichtheid,
          },
        },
        upsert: true,
      },
    }));

    await DailyTeamMetricModel.bulkWrite(ops);
  }

  private async aggregateOverallMetrics(
    baseMatch: any,
    entities: EntityContext,
    date: Date
  ) {
    if (!entities.companyId) return;

    // Create a match that only includes REVIEWED status and the specific company
    const companyMatch = {
      ...baseMatch,
      companyId: entities.companyId,
      reviewStatus: ReviewStatus.REVIEWED,
    };

    // Remove any entity-specific filters
    delete companyMatch.employeeId;
    delete companyMatch.teamId;
    delete companyMatch.contactId;
    delete companyMatch.externalCompanyId;

    // Calculate overall score average (only for performance and both types)
    const overallResult = await ReviewModel.aggregate([
      {
        $match: {
          ...companyMatch,
          type: { $in: ["performance", "both"] },
        },
      },
      {
        $group: {
          _id: null,
          avgOverall: { $avg: "$overallScore" },
          reviewCountOverall: { $sum: 1 },
        },
      },
    ]);

    // Calculate sentiment score average (only for sentiment and both types)
    const sentimentResult = await ReviewModel.aggregate([
      {
        $match: {
          ...companyMatch,
          type: { $in: ["sentiment", "both"] },
        },
      },
      {
        $group: {
          _id: null,
          avgSentiment: { $avg: "$sentimentScore" },
          reviewCountSentiment: { $sum: 1 },
        },
      },
    ]);

    // Get total review count (all types)
    const totalResult = await ReviewModel.aggregate([
      { $match: companyMatch },
      {
        $group: {
          _id: null,
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (totalResult.length === 0 || totalResult[0].reviewCount === 0) {
      // Delete the metric if no reviews found
      await DailyReviewMetricModel.deleteOne({
        date,
        companyId: entities.companyId,
      });
      return;
    }

    // Update or create the daily metric
    await DailyReviewMetricModel.findOneAndUpdate(
      {
        date,
        companyId: entities.companyId,
      },
      {
        $set: {
          avgOverall:
            overallResult.length > 0 ? overallResult[0].avgOverall || 0 : 0,
          avgSentiment:
            sentimentResult.length > 0
              ? sentimentResult[0].avgSentiment || 0
              : 0,
          reviewCount: totalResult[0].reviewCount,
        },
      },
      { upsert: true }
    );
  }

  private async aggregateCriteriaMetrics(
    baseMatch: any,
    entities: EntityContext,
    date: Date
  ) {
    const results = await ReviewModel.aggregate([
      { $match: baseMatch },
      { $unwind: "$criteriaScores" },
      {
        $group: {
          _id: "$criteriaScores.criterionName",
          avgScore: { $avg: "$criteriaScores.score" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (results.length === 0) {
      await DailyCriterionMetricModel.deleteMany({ date, ...entities });
      return;
    }

    const ops = results.map((row) => ({
      updateOne: {
        filter: {
          date,
          criterionName: row._id,
          ...this.filterMetricEntities(entities),
        },
        update: {
          $set: {
            avgScore: row.avgScore || 0,
            reviewCount: row.reviewCount,
          },
        },
        upsert: true,
      },
    }));

    await DailyCriterionMetricModel.bulkWrite(ops);
  }

  // ------------------------------------------------------------
  //  Helpers
  // ------------------------------------------------------------
  private buildBaseMatch(date: Date, entities: EntityContext) {
    const nextDay = addDays(date, 1);

    return {
      createdAt: { $gte: date, $lt: nextDay },
      reviewStatus: ReviewStatus.REVIEWED,
      deletedAt: null,
      ...(entities.companyId && { companyId: entities.companyId }),
      ...(entities.employeeId && { employeeId: entities.employeeId }),
      ...(entities.teamId && { teamId: entities.teamId }),
      ...(entities.contactId && { contactId: entities.contactId }),
      ...(entities.externalCompanyId && {
        externalCompanyId: entities.externalCompanyId,
      }),
    };
  }

  /**
   * Removes fields that are not part of any metrics schemas
   */
  private sanitizeEntities(entities: EntityContext): EntityContext {
    const { externalCompanyId, ...safeEntities } = entities;
    return safeEntities;
  }

  private filterMetricEntities(entities: EntityContext) {
    return entities.companyId ? { companyId: entities.companyId } : {};
  }
}
