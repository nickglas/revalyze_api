import { Service } from "typedi";
import mongoose from "mongoose";
import {
  ReviewRepository,
  ReviewFilterOptions,
} from "../repositories/review.repository";
import { IReview } from "../models/review.model";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import { CreateReviewDto } from "../dto/review/review.create.dto";
import { ITranscript } from "../models/transcript.model";
import { IReviewConfig } from "../models/review.config.model";
import { TranscriptRepository } from "../repositories/transcript.repository";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import { CriteriaRepository } from "../repositories/criteria.repository";

@Service()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly reviewConfigRepository: ReviewConfigRepository,
    private readonly criteriaRepository: CriteriaRepository
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
    companyId: mongoose.Types.ObjectId,
    transcriptId?: string,
    type?: "performance" | "sentiment" | "both",
    employeeId?: string,
    externalCompanyId?: string,
    clientId?: string,
    createdAtFrom?: Date,
    createdAtTo?: Date,
    page = 1,
    limit = 20
  ): Promise<{ reviews: IReview[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    const filter: ReviewFilterOptions = { companyId };

    if (transcriptId && mongoose.Types.ObjectId.isValid(transcriptId)) {
      filter.transcriptId = new mongoose.Types.ObjectId(transcriptId);
    }

    if (type) {
      filter.type = type;
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    if (
      externalCompanyId &&
      mongoose.Types.ObjectId.isValid(externalCompanyId)
    ) {
      filter.externalCompanyId = new mongoose.Types.ObjectId(externalCompanyId);
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    }

    if (createdAtFrom || createdAtTo) {
      filter.createdAtRange = {};
      if (createdAtFrom) filter.createdAtRange.from = createdAtFrom;
      if (createdAtTo) filter.createdAtRange.to = createdAtTo;
    }

    return this.reviewRepository.getAll({
      ...filter,
      page,
      limit,
    });
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
  ): Promise<IReview> {
    if (!id) throw new BadRequestError("No review id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const review = await this.reviewRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!review) throw new NotFoundError(`Review not found with id ${id}`);

    return review;
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
    companyId: mongoose.Types.ObjectId
  ): Promise<IReview> {
    if (!companyId) throw new BadRequestError("Missing company ID");

    // 1. Get and validate transcript
    const transcript = await this.transcriptRepository.findOne({
      _id: new mongoose.Types.ObjectId(dto.transcriptId),
      companyId,
    });

    if (!transcript) {
      throw new NotFoundError(
        `Transcript with ID ${dto.transcriptId} not found or doesn't belong to company ${companyId}`
      );
    }

    // 2. Get and validate review config
    const config = await this.reviewConfigRepository.findOne({
      _id: new mongoose.Types.ObjectId(dto.reviewConfigId),
      companyId,
    });

    if (!config) {
      throw new NotFoundError(
        `Review configuration with ID ${dto.reviewConfigId} not found or doesn't belong to company ${companyId}`
      );
    }

    if (!config.isActive) {
      throw new ForbiddenError("Review configuration is not active");
    }

    // 3. Fetch and validate all criteria
    const criterionIds = config.criteriaIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

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

    // 4. Create review object
    const reviewData: Partial<IReview> = {
      transcriptId: transcript.id,
      reviewConfig: {
        ...config.toJSON?.(),
        criteria: criteria.map((c) => c.toJSON?.() ?? c),
      },
      type: dto.type,
      criteriaScores: [],
      externalCompanyId: transcript.externalCompanyId,
      employeeId: transcript.employeeId,
      clientId: transcript.contactId,
      companyId: transcript.companyId,
    };

    // 5. Save review
    return await this.reviewRepository.create(reviewData);
  }
}
