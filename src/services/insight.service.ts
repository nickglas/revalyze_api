import { Service } from "typedi";
import { UserRepository } from "../repositories/user.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { IUserDocument } from "../models/entities/user.entity";
import { NotFoundError } from "../utils/errors";

@Service()
export class InsightsService {
  constructor(
    private userRepo: UserRepository,
    private reviewRepo: ReviewRepository
  ) {}

  async getEmployeeSummary(employeeId: string) {
    const employee = await this.userRepo.findById(employeeId);
    if (!employee || !employee.metrics) {
      throw new NotFoundError("Employee metrics not found");
    }

    const recentReviews = await this.reviewRepo.findRecentByEmployeeId(
      employeeId,
      5
    );

    return {
      performance: {
        overallScore: employee.metrics.overallScore,
        sentimentScore: employee.metrics.sentimentScore,
        improvement: this.calculateImprovement(employee.metrics),
        periodComparison: this.getPeriodComparison(employee.metrics),
      },
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        date: r.createdAt,
        overallScore: r.overallScore,
        sentimentScore: r.sentimentScore,
        client: r.externalCompanyId || "Unknown",
      })),
      activity: {
        reviewCount: employee.metrics.reviewCount,
        lastReviewDate: this.getLastReviewDate(recentReviews),
      },
    };
  }

  async getEmployeeDetails(employeeId: string, timeframe: string) {
    const employee = await this.userRepo.findById(employeeId);
    if (!employee || !employee.metrics) {
      throw new NotFoundError("Employee metrics not found");
    }

    const reviews = await this.reviewRepo.findByEmployeeId(employeeId);
    const companyIds = [
      ...new Set(reviews.map((r) => r.externalCompanyId?.toString())),
    ];

    // In a real implementation, you'd fetch company names here
    const companyPerformance = companyIds.map((id) => ({
      companyId: id,
      name: `Company ${id?.slice(-4)}`, // Placeholder
      avgScore: this.calcCompanyAvg(reviews, id),
      sentiment: this.calcCompanySentiment(reviews, id),
      reviewCount: reviews.filter((r) => r.externalCompanyId?.toString() === id)
        .length,
    }));

    return {
      criteriaBreakdown: this.calcCriteriaBreakdown(reviews),
      companyPerformance,
      trends: this.calcTrends(reviews, timeframe),
    };
  }

  private calculateImprovement(metrics: IUserDocument["metrics"]) {
    if (!metrics || metrics.lastPeriodScores.length < 2) return 0;

    const current = metrics.lastPeriodScores[0];
    const previous = metrics.lastPeriodScores[1];
    return parseFloat((current.overall - previous.overall).toFixed(2));
  }

  private getPeriodComparison(metrics: IUserDocument["metrics"]) {
    if (!metrics || metrics.lastPeriodScores.length === 0) return [];
    return metrics.lastPeriodScores.slice(0, 2);
  }

  private getLastReviewDate(reviews: any[]) {
    return reviews.length > 0 ? reviews[0].createdAt : null;
  }

  private calcCriteriaBreakdown(reviews: any[]) {
    const breakdown: Record<string, { total: number; count: number }> = {};

    reviews.forEach((review) => {
      review.criteriaScores.forEach((c: any) => {
        if (!breakdown[c.criterionName]) {
          breakdown[c.criterionName] = { total: 0, count: 0 };
        }
        breakdown[c.criterionName].total += c.score;
        breakdown[c.criterionName].count++;
      });
    });

    return Object.entries(breakdown).map(([name, data]) => ({
      name,
      avgScore: parseFloat((data.total / data.count).toFixed(2)),
      count: data.count,
    }));
  }

  private calcCompanyAvg(reviews: any[], companyId?: string) {
    const companyReviews = companyId
      ? reviews.filter((r) => r.externalCompanyId?.toString() === companyId)
      : reviews;

    if (companyReviews.length === 0) return 0;

    const total = companyReviews.reduce((sum, r) => sum + r.overallScore, 0);
    return parseFloat((total / companyReviews.length).toFixed(2));
  }

  private calcCompanySentiment(reviews: any[], companyId?: string) {
    const companyReviews = companyId
      ? reviews.filter((r) => r.externalCompanyId?.toString() === companyId)
      : reviews;

    if (companyReviews.length === 0) return 0;

    const total = companyReviews.reduce(
      (sum, r) => sum + (r.sentimentScore || 0),
      0
    );
    return parseFloat((total / companyReviews.length).toFixed(2));
  }

  private calcTrends(reviews: any[], timeframe: string) {
    // Simplified implementation - in real app you'd group by timeframe
    return {
      performance: reviews.map((r) => r.overallScore).slice(-10),
      sentiment: reviews.map((r) => r.sentimentScore || 0).slice(-10),
      timeframe,
    };
  }
}
