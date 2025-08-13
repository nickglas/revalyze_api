import { Service } from "typedi";
import mongoose from "mongoose";
import { TranscriptRepository } from "../repositories/transcript.repository";
import {
  TranscriptModel,
  ITranscriptDocument,
} from "../models/entities/transcript.entity";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "../utils/errors";
import {
  CreateTranscriptDto,
  ReviewType,
} from "../dto/transcript/transcript.create.dto";
import { CompanyRepository } from "../repositories/company.repository";
import { ExternalCompanyRepository } from "../repositories/external.company.repository";
import { ContactRepository } from "../repositories/contact.repository";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { UserRepository } from "../repositories/user.repository";
import { ReviewModel, IReviewDocument } from "../models/entities/review.entity";
import { ReviewRepository } from "../repositories/review.repository";
import { TranscriptSummaryDto } from "../dto/transcript/transcript.summary.dto";
import { privateDecrypt } from "crypto";
import { ReviewService } from "./review.service";
import { ReviewConfigRepository } from "../repositories/review.config.repository";

@Service()
export class TranscriptService {
  constructor(
    private readonly transcriptRepository: TranscriptRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly externalCompanyRepository: ExternalCompanyRepository,
    private readonly contactRepository: ContactRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly userRepository: UserRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly reviewService: ReviewService,
    private readonly reviewConfigRepository: ReviewConfigRepository
  ) {}

  /**
   * Get paginated transcripts list with advanced filters
   * @param companyId - The ObjectId of the company.
   * @param search - Optional search string in transcript content.
   * @param employeeId - Filter by employee ID.
   * @param externalCompanyId - Filter by external company ID.
   * @param contactId - Filter by contact ID.
   * @param timestampFrom - Start date for timestamp filter.
   * @param timestampTo - End date for timestamp filter.
   * @param createdAtFrom - Start date for creation filter.
   * @param createdAtTo - End date for creation filter.
   * @param page - Page number for pagination.
   * @param limit - Items per page for pagination.
   * @returns Paginated transcripts and total count.
   */
  async getTranscripts(
    companyId: mongoose.Types.ObjectId,
    search?: string,
    employeeId?: string,
    externalCompanyId?: string,
    contactId?: string,
    timestampFrom?: Date,
    timestampTo?: Date,
    createdAtFrom?: Date,
    createdAtTo?: Date,
    page = 1,
    limit = 20,
    sortBy = "timestamp",
    sortOrder = -1
  ): Promise<{ transcripts: TranscriptSummaryDto[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.transcriptRepository.findByCompanyId(companyId, {
      search,
      employeeId,
      externalCompanyId,
      contactId,
      timestampRange:
        timestampFrom || timestampTo
          ? { from: timestampFrom, to: timestampTo }
          : undefined,
      createdAtRange:
        createdAtFrom || createdAtTo
          ? { from: createdAtFrom, to: createdAtTo }
          : undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  async getReviewsById(
    transcriptId: string | mongoose.Types.ObjectId,
    companyId: string | mongoose.Types.ObjectId
  ): Promise<IReviewDocument[]> {
    if (!transcriptId) throw new BadRequestError("No transcript id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const reviews = await this.reviewRepository.find({
      transcriptId: transcriptId,
      companyId: companyId,
    });

    if (!reviews)
      throw new NotFoundError(
        `No reviews found for transcript with id ${transcriptId}`
      );

    return reviews;
  }

  /**
   * Retrieves a single transcript by ID and company ID to ensure ownership.
   * @param id - The transcript document ID.
   * @param companyId - The ObjectId of the company.
   * @returns The transcript document or throws NotFoundError.
   */
  async getById(
    id: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<ITranscriptDocument> {
    if (!id) throw new BadRequestError("No transcript id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const transcript = await this.transcriptRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!transcript)
      throw new NotFoundError(`Transcript not found with id ${id}`);

    return transcript;
  }

  /**
   * Creates a new transcript for the given company and employee.
   *
   * Validates:
   * - Company existence and active status
   * - External company existence, relation to company, and active status
   * - Contact existence, relation to external company, and active status
   * - Employee ID (admin-set or token-based) and its existence
   * - Uploader existence and active status
   * - Active subscription and monthly transcript limit
   *
   * Admins can optionally set a different employee ID via the DTO.
   * Non-admins must use their own ID as the employee.
   *
   * @param dto - Transcript content and metadata from the request body.
   * @param companyId - The ID of the company uploading the transcript (from token).
   * @param employeeIdFromToken - The ID of the logged-in user (default employee ID).
   * @param uploadedBy - The ID of the user uploading the transcript.
   * @param userRole - The role of the user (e.g., "COMPANY_ADMIN") used to authorize setting a custom employeeId.
   * @returns The newly created transcript document.
   * @throws BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError
   */
  async createTranscript(
    dto: CreateTranscriptDto,
    companyId: mongoose.Types.ObjectId,
    employeeIdFromToken: mongoose.Types.ObjectId,
    uploadedById: mongoose.Types.ObjectId,
    userRole: string
  ): Promise<ITranscriptDocument> {
    if (!companyId) throw new BadRequestError("Missing company ID");
    if (!employeeIdFromToken) throw new BadRequestError("Missing employee ID");
    if (!uploadedById) throw new BadRequestError("Missing uploader ID");

    // Validate externalCompanyId belongs to the company and exists
    if (dto.externalCompanyId) {
      const externalCompany = await this.externalCompanyRepository.findOne({
        _id: new mongoose.Types.ObjectId(dto.externalCompanyId),
        companyId,
      });
      if (!externalCompany)
        throw new NotFoundError(
          `External company with id ${dto.externalCompanyId} not found or does not belong to company ${companyId}`
        );

      if (!externalCompany.isActive)
        throw new BadRequestError(
          `External company with id ${dto.externalCompanyId} is not active`
        );
    }

    // Validate contact belongs to the external company
    if (dto.contactId) {
      const contact = await this.contactRepository.findOne({
        _id: new mongoose.Types.ObjectId(dto.contactId),
        externalCompanyId: new mongoose.Types.ObjectId(dto.externalCompanyId),
      });
      if (!contact)
        throw new NotFoundError(
          `Contact with id ${dto.contactId} not found or does not belong to external company ${dto.externalCompanyId}`
        );

      if (!contact.isActive)
        throw new BadRequestError(
          `Contact with id ${dto.contactId} is not active`
        );
    }

    // Validate employeeId (if provided and admin)
    let finalEmployeeId: mongoose.Types.ObjectId;
    if (userRole === "COMPANY_ADMIN" && dto.employeeId) {
      if (!mongoose.Types.ObjectId.isValid(dto.employeeId))
        throw new BadRequestError("Invalid employeeId format");

      const employeeExists = await this.userRepository.findById(
        new mongoose.Types.ObjectId(dto.employeeId)
      );
      if (!employeeExists)
        throw new NotFoundError(
          `Employee with id ${dto.employeeId} was not found`
        );

      finalEmployeeId = new mongoose.Types.ObjectId(dto.employeeId);
    } else {
      // Use the employeeId from the token for non-admins or if no override provided
      finalEmployeeId = employeeIdFromToken;
    }

    // Prepare transcript data
    const transcriptData: Partial<ITranscriptDocument> = {
      companyId,
      employeeId: finalEmployeeId,
      uploadedById,
      externalCompanyId: dto.externalCompanyId
        ? new mongoose.Types.ObjectId(dto.externalCompanyId)
        : undefined,
      contactId: dto.contactId
        ? new mongoose.Types.ObjectId(dto.contactId)
        : undefined,
      content: dto.content,
      timestamp: new Date(dto.timestamp),
    };

    // Create and return the transcript
    const transcript = await this.transcriptRepository.create(transcriptData);

    if (dto.autoStartReview) {
      // Validate review type requirements
      if (dto.reviewType === "performance" || dto.reviewType === "both") {
        if (!dto.reviewConfigId) {
          throw new BadRequestError(
            "reviewConfigId is required for performance or both review types"
          );
        }
      }

      const subscription = await this.subscriptionRepository.findOne({
        companyId: companyId,
        status: "active",
      });

      if (!subscription) return transcript;

      this.reviewService.createReview(
        {
          transcriptId: transcript.id,
          reviewConfigId: dto.reviewConfigId!,
          type: dto.reviewType || ReviewType.BOTH,
          criteriaWeights: dto.criteriaWeights,
        },
        companyId,
        subscription
      );
    }

    return transcript;
  }

  /**
   * Deletes a transcript if it belongs to the given company.
   * @param id - Transcript ID.
   * @param companyId - Company ownership check.
   * @returns The deleted transcript or throws NotFoundError.
   */
  async deleteTranscriptById(
    id: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<ITranscriptDocument> {
    if (!id) throw new BadRequestError("No transcript id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const transcript = await this.transcriptRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!transcript)
      throw new NotFoundError(`Transcript not found with id ${id}`);

    const deleted = await this.transcriptRepository.deleteById(id);
    if (!deleted) throw new NotFoundError("Transcript could not be deleted");

    return deleted;
  }
}
