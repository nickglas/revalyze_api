import { Service } from "typedi";
import mongoose, { mongo, Types } from "mongoose";
import {
  ReviewRepository,
  ReviewFilterOptions,
} from "../repositories/review.repository";
import { ReviewModel, IReviewDocument } from "../models/entities/review.entity";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import { CreateReviewDto } from "../dto/review/review.create.dto";
import {
  TranscriptModel,
  ITranscriptDocument,
} from "../models/entities/transcript.entity";
import {
  IReviewConfigDocument,
  ReviewConfigModel,
} from "../models/entities/review.config.entity";
import { TranscriptRepository } from "../repositories/transcript.repository";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import { CriteriaRepository } from "../repositories/criteria.repository";
import { OpenAIService } from "./openAI.service";
import {
  CriterionModel,
  ICriterionDocument,
} from "../models/entities/criterion.entity";
import { ReviewStatus } from "../models/types/transcript.type";
import { ISubscriptionDocument } from "../models/entities/subscription.entity";
import { UserRepository } from "../repositories/user.repository";
import { ReviewSummaryDto } from "../dto/review/review.summary.dto";
import { CriteriaFlowData } from "../models/types/criterion.type";
import { ObjectId } from "mongodb";

interface ReviewServiceOptions {
  companyId: mongoose.Types.ObjectId;
  transcriptId?: string;
  type?: "performance" | "sentiment" | "both";
  employeeId?: string;
  externalCompanyId?: string;
  clientId?: string;
  createdAtFrom?: Date;
  createdAtTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: number;
}

@Service()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly reviewConfigRepository: ReviewConfigRepository,
    private readonly criteriaRepository: CriteriaRepository,
    private readonly openAIService: OpenAIService,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Get paginated reviews list with advanced filters
   * @param companyId - Company ID (required)
   * @param transcriptId - Filter by transcript ID (optional)
   * @param type - Filter by review type ("performance", "sentiment", "both") (optional)
   * @param employeeId - Filter by employee ID (optional)
   * @param externalCompanyId - Filter by external company ID (optional)
   * @param clientId - Filter by client ID (optional)
   * @param createdAtFrom - Filter reviews created after this date (optional)
   * @param createdAtTo - Filter reviews created before this date (optional)
   * @param page - Pagination page (default 1)
   * @param limit - Pagination limit (default 20)
   * @returns Paginated reviews and total count
   */
  async getReviews(
    options: ReviewServiceOptions
  ): Promise<{ reviews: ReviewSummaryDto[]; total: number }> {
    const {
      companyId,
      transcriptId,
      type,
      employeeId,
      externalCompanyId,
      clientId,
      createdAtFrom,
      createdAtTo,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = -1,
    } = options;

    if (!companyId) throw new BadRequestError("Company ID is required");

    return this.reviewRepository.getAll({
      companyId,
      transcriptId,
      type,
      employeeId,
      externalCompanyId,
      clientId,
      createdAtRange: {
        from: createdAtFrom,
        to: createdAtTo,
      },
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  async isReviewQuotaAvailable(
    companyId: string | mongoose.Types.ObjectId,
    subscription: any
  ): Promise<boolean> {
    console.warn(subscription);
    const start = new Date(subscription.currentPeriodStart);
    const end = new Date(subscription.currentPeriodEnd);

    const reviewCount =
      await this.reviewRepository.countReviewsWithinPeriodByCompany(
        companyId,
        start,
        end
      );

    return reviewCount < subscription.allowedReviews;
  }

  /**
   * Retrieves a single review by ID and company ID to ensure ownership.
   * @param id - The review document ID.
   * @param companyId - The ObjectId of the company.
   * @returns The review document or throws NotFoundError.
   */
  async getById(
    id: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IReviewDocument> {
    if (!id) throw new BadRequestError("No review id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const review = await this.reviewRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!review) throw new NotFoundError(`Review not found with id ${id}`);

    return review;
  }

  async retryReview(
    reviewId: string,
    companyId: mongoose.Types.ObjectId,
    subscription: ISubscriptionDocument
  ): Promise<IReviewDocument> {
    // Get failed review and validate
    const failedReview = await this.reviewRepository.findOne({
      _id: reviewId,
      companyId,
      reviewStatus: ReviewStatus.ERROR,
    });

    if (!failedReview) {
      throw new NotFoundError("Failed review not found or not in ERROR state");
    }

    // Check quota
    const quotaAvailable = await this.isReviewQuotaAvailable(
      companyId,
      subscription
    );
    if (!quotaAvailable) {
      throw new ForbiddenError("Review quota exceeded for current period");
    }

    // Get transcript
    const transcript = await this.findTranscriptOrThrow(
      failedReview.transcriptId,
      companyId
    );

    let data: CriteriaFlowData[] = [];

    // Only process performance-related components if needed
    if (failedReview.type === "performance" || failedReview.type === "both") {
      // Extract criterion IDs from the embedded config
      const criterionIds =
        failedReview.reviewConfig?.criteria?.map(
          (c) => new mongoose.Types.ObjectId(c.criterionId)
        ) ?? [];

      // Fetch full criteria documents
      const fullCriteria = await this.findCriterionOrThrow(criterionIds);

      // Create mapping for quick lookup
      const criteriaMap = new Map(
        fullCriteria.map((c) => [c._id.toString(), c])
      );

      // Build data array with weights and criterion details
      failedReview.reviewConfig?.criteria?.forEach((c) => {
        const match = criteriaMap.get(c.criterionId.toString());
        data.push({
          _id: c.criterionId,
          weight: c.weight,
          title: match?.title ?? "",
          description: match?.description ?? "",
        });
      });
    }

    // Reset review status
    failedReview.reviewStatus = ReviewStatus.NOT_STARTED;
    await failedReview.save();

    // Start review processing
    this.processOpenAIReview(
      failedReview,
      failedReview.reviewConfig, // Use the embedded config
      transcript,
      data, // Pass the built data array
      failedReview.type
    ).catch((err) => {
      console.error("Async OpenAI retry failed:", err);
    });

    return failedReview;
  }

  async createReviewFromTranscript(
    dto: CreateReviewDto,
    companyId: mongoose.Types.ObjectId | string,
    subscription: ISubscriptionDocument
  ) {
    if (!companyId) throw new BadRequestError("Missing company ID");

    // Validate review quota
    if (!(await this.isReviewQuotaAvailable(companyId, subscription)))
      throw new ForbiddenError("Review quota has been reached");

    // Validate transcript
    const transcript = await this.findTranscriptOrThrow(
      dto.transcriptId,
      companyId
    );

    let reviewData: Partial<IReviewDocument> = {
      transcriptId: transcript.id,
      type: dto.type,
      criteriaScores: [],
      externalCompanyId: transcript.externalCompanyId,
      employeeId: transcript.employeeId,
      clientId: transcript.contactId,
      companyId: transcript.companyId,
      reviewStatus: ReviewStatus.NOT_STARTED,
      reviewConfig: undefined,
    };

    let data: CriteriaFlowData[] = [];

    if (dto.type === "performance" || dto.type === "both") {
      const ids = dto.criteriaWeights?.map((x) => x.criterionId) ?? [];
      const originalCriteria = await this.findCriterionOrThrow(ids);

      const originalConfigDoc = await this.findValidConfigOrThrow(
        dto.reviewConfigId,
        companyId
      );

      const originalConfig = originalConfigDoc.toObject();

      originalConfig.criteria = dto.criteriaWeights?.map((x) => ({
        criterionId: new mongoose.Types.ObjectId(x.criterionId),
        weight: x.weight,
      }));

      console.warn(originalCriteria);

      const criteriaMap = new Map(
        originalCriteria.map((c) => [c._id.toString(), c])
      );

      originalConfig.criteria?.forEach((x) => {
        const match = criteriaMap.get(x.criterionId.toString());
        data.push({
          _id: x.criterionId,
          weight: x.weight,
          title: match?.title ?? "",
          description: match?.description ?? "",
        });
      });

      reviewData.reviewConfig = originalConfig;
    }

    const review = await this.reviewRepository.create(reviewData);

    this.processOpenAIReview(
      review,
      reviewData.reviewConfig,
      transcript,
      data,
      dto.type
    ).catch((err) => {
      console.error("Async OpenAI processing failed:", err);
    });
  }

  /**
   * Creates a new AI-generated review from a transcript and a review config.
   *
   * @param dto - The DTO containing transcriptId, reviewConfigId, and review type.
   * @param companyId - The ID of the company creating the review.
   * @returns The newly created review document.
   */
  async createReview(
    dto: CreateReviewDto,
    companyId: mongoose.Types.ObjectId | string,
    subscription: ISubscriptionDocument
  ): Promise<IReviewDocument> {
    if (!companyId) throw new BadRequestError("Missing company ID");

    // Validate review quota
    if (!(await this.isReviewQuotaAvailable(companyId, subscription)))
      throw new ForbiddenError("Review quota has been reached");

    // Validate transcript
    const transcript = await this.findTranscriptOrThrow(
      dto.transcriptId,
      companyId
    );

    let reviewData: Partial<IReviewDocument> = {
      transcriptId: transcript.id,
      type: dto.type,
      criteriaScores: [],
      externalCompanyId: transcript.externalCompanyId,
      employeeId: transcript.employeeId,
      clientId: transcript.contactId,
      companyId: transcript.companyId,
      reviewStatus: ReviewStatus.NOT_STARTED,
      reviewConfig: undefined,
    };

    let data: CriteriaFlowData[] = [];

    if (dto.type === "performance" || dto.type === "both") {
      if (!dto.reviewConfigId) {
        throw new BadRequestError(
          "reviewConfigId is required for performance or both review types"
        );
      }

      // Fetch and validate review config
      const config = await this.findValidConfigOrThrow(
        dto.reviewConfigId,
        companyId
      );

      // Get plain object representation of config
      const reviewConfig = config.toObject();

      // Apply DTO weights if provided
      if (dto.criteriaWeights) {
        reviewConfig.criteria = dto.criteriaWeights.map((x) => ({
          criterionId: new mongoose.Types.ObjectId(x.criterionId),
          weight: x.weight,
        }));
      }

      // Fetch full criteria documents
      const criteriaIds =
        reviewConfig.criteria?.map((x) => x.criterionId) ?? [];
      const fullCriteria = await this.findCriterionOrThrow(criteriaIds);

      // Create mapping for quick lookup
      const criteriaMap = new Map(
        fullCriteria.map((c) => [c._id.toString(), c])
      );

      // Build data array with weights and criterion details
      reviewConfig.criteria?.forEach((x) => {
        const match = criteriaMap.get(x.criterionId.toString());
        data.push({
          _id: x.criterionId,
          weight: x.weight,
          title: match?.title ?? "",
          description: match?.description ?? "",
        });
      });

      reviewData.reviewConfig = reviewConfig;
    }

    const review = await this.reviewRepository.create(reviewData);

    this.processOpenAIReview(
      review,
      reviewData.reviewConfig,
      transcript,
      data,
      dto.type
    ).catch((err) => {
      console.error("Async OpenAI processing failed:", err);
    });

    return review;
  }

  // Helper method to process OpenAI review asynchronously
  private async processOpenAIReview(
    review: IReviewDocument,
    config: any,
    transcript: ITranscriptDocument,
    criteria: CriteriaFlowData[],
    type: "performance" | "sentiment" | "both"
  ) {
    try {
      review.reviewStatus = ReviewStatus.STARTED;
      await review.save();

      let aiResult: any;
      if (type === "sentiment") {
        aiResult = await this.openAIService.createSentimentAnalysis(transcript);
      } else {
        aiResult = await this.openAIService.createChatCompletion(
          config,
          transcript,
          criteria,
          type
        );
      }

      // Handle insufficient content error
      if (aiResult.error) {
        review.reviewStatus = ReviewStatus.ERROR;
        review.errorMessage = aiResult.error;
        await review.save();
        return;
      }

      // Update based on review type
      if (type === "sentiment") {
        review.sentimentScore = aiResult.sentimentScore;
        review.sentimentLabel = aiResult.sentimentLabel;
        review.sentimentAnalysis = aiResult.sentimentAnalysis;
      } else {
        review.overallScore = aiResult.overallScore;
        review.overallFeedback = aiResult.overallFeedback;
        review.criteriaScores = aiResult.criteriaScores;
        review.sentimentScore = aiResult.sentimentScore;
        review.sentimentLabel = aiResult.sentimentLabel;
        review.sentimentAnalysis = aiResult.sentimentAnalysis;
      }

      review.subject = aiResult.subject;
      review.reviewStatus = ReviewStatus.REVIEWED;
      await review.save();

      // Update transcript status
      transcript.isReviewed = true;
      transcript.reviewStatus = ReviewStatus.REVIEWED;
      await transcript.save();

      await this.updateUserMetrics(transcript.employeeId.toString());
    } catch (error) {
      console.error("Error processing OpenAI review:", error);
      review.reviewStatus = ReviewStatus.ERROR;

      if (error instanceof Error) {
        review.errorMessage = error.message;
      } else if (typeof error === "string") {
        review.errorMessage = error;
      } else {
        review.errorMessage = "Unknown error occurred during processing";
      }

      await review.save();
    }
  }

  //helpers
  private async findTranscriptOrThrow(
    transcriptId: string | mongoose.Types.ObjectId,
    companyId: string | mongoose.Types.ObjectId
  ) {
    const transcript = await this.transcriptRepository.findOne({
      _id: new mongoose.Types.ObjectId(transcriptId),
      companyId: companyId,
    });
    if (!transcript) {
      throw new NotFoundError(
        `Transcript with ID ${transcriptId} not found or doesn't belong to company ${companyId}`
      );
    }
    return transcript;
  }

  private async findValidConfigOrThrow(
    reviewConfigId: string | mongoose.Types.ObjectId,
    companyId: string | mongoose.Types.ObjectId
  ) {
    const config = await this.reviewConfigRepository.findOne({
      _id: new mongoose.Types.ObjectId(reviewConfigId),
      companyId,
    });
    if (!config) {
      throw new NotFoundError(
        `Review configuration with ID ${reviewConfigId} not found or doesn't belong to company ${companyId}`
      );
    }
    if (!config.isActive) {
      throw new ForbiddenError("Review configuration is not active");
    }
    return config;
  }

  private async findCriterionOrThrow(
    ids: string[] | mongoose.Types.ObjectId[]
  ) {
    const criterionIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const criteria = await this.criteriaRepository.findManyByIds(criterionIds);
    if (criteria.length !== criterionIds.length) {
      const foundIds = criteria.map((c) => c._id.toString());
      const missing = criterionIds.filter(
        (id) => !foundIds.includes(id.toString())
      );
      throw new NotFoundError(
        `Missing criteria with IDs: ${missing.join(", ")}`
      );
    }
    return criteria;
  }

  private async updateUserMetrics(employeeId: string) {
    try {
      const employee = await this.userRepository.findById(employeeId);
      if (!employee) return;

      const reviews = await this.reviewRepository.findByEmployeeId(employeeId);

      // Calculate metrics
      const overallSum = reviews.reduce((sum, r) => sum + r.overallScore, 0);
      const sentimentSum = reviews.reduce(
        (sum, r) =>
          sum + (typeof r.sentimentScore === "number" ? r.sentimentScore : 0),
        0
      );

      // Initialize metrics if needed
      employee.metrics = employee.metrics || {
        reviewCount: 0,
        overallScore: 0,
        sentimentScore: 0,
        lastPeriodScores: [],
      };

      // Update metrics
      employee.metrics.reviewCount = reviews.length;
      employee.metrics.overallScore = reviews.length
        ? parseFloat((overallSum / reviews.length).toFixed(2))
        : 0;
      employee.metrics.sentimentScore = reviews.length
        ? parseFloat((sentimentSum / reviews.length).toFixed(2))
        : 0;
      employee.metrics.lastCalculated = new Date();

      // Update period scores
      employee.metrics.lastPeriodScores = this.updatePeriodScores(
        employee.metrics.lastPeriodScores,
        reviews
      );

      await employee.save();
    } catch (error) {
      console.error("Error updating user metrics:", error);
      // Fail silently for metrics updates
    }
  }

  private updatePeriodScores(
    existing: any[],
    reviews: IReviewDocument[]
  ): any[] {
    const currentPeriod = this.getCurrentPeriod();
    const periodReviews = reviews.filter(
      (r) => this.getPeriodFromDate(r.createdAt) === currentPeriod
    );

    if (!periodReviews.length) return existing;

    const periodOverall =
      periodReviews.reduce((sum, r) => sum + r.overallScore, 0) /
      periodReviews.length;
    const periodSentiment =
      periodReviews.reduce(
        (sum, r) =>
          sum + (typeof r.sentimentScore === "number" ? r.sentimentScore : 0),
        0
      ) / periodReviews.length;

    // Update or add current period
    const updated = existing.filter((p) => p.period !== currentPeriod);
    updated.push({
      period: currentPeriod,
      overall: parseFloat(periodOverall.toFixed(2)),
      sentiment: parseFloat(periodSentiment.toFixed(2)),
    });

    // Keep only last 6 periods (most recent first)
    return updated.sort((a, b) => b.period.localeCompare(a.period)).slice(0, 6);
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  }

  private getPeriodFromDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  }
}
