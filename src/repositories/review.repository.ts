import { Service } from "typedi";
import Review, { IReview } from "../models/review.model";
import mongoose, { FilterQuery } from "mongoose";

type DateRange = { from?: Date; to?: Date };

export interface ReviewFilterOptions {
  transcriptId?: string | mongoose.Types.ObjectId;
  type?: "performance" | "sentiment" | "both";
  externalCompanyId?: string | mongoose.Types.ObjectId;
  employeeId?: string | mongoose.Types.ObjectId;
  clientId?: string | mongoose.Types.ObjectId;
  companyId?: string | mongoose.Types.ObjectId;
  sentimentScoreRange?: { min?: number; max?: number };
  createdAtRange?: DateRange;
  page?: number;
  limit?: number;
}

@Service()
export class ReviewRepository {
  async getAll(
    options: ReviewFilterOptions = {}
  ): Promise<{ reviews: IReview[]; total: number }> {
    const {
      transcriptId,
      type,
      externalCompanyId,
      employeeId,
      clientId,
      companyId,
      sentimentScoreRange,
      createdAtRange,
      page = 1,
      limit = 20,
    } = options;

    const filter: FilterQuery<IReview> = {};

    if (transcriptId && mongoose.Types.ObjectId.isValid(transcriptId)) {
      filter.transcriptId = new mongoose.Types.ObjectId(transcriptId);
    }

    if (type) {
      filter.type = type;
    }

    if (
      externalCompanyId &&
      mongoose.Types.ObjectId.isValid(externalCompanyId)
    ) {
      filter.externalCompanyId = new mongoose.Types.ObjectId(externalCompanyId);
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    }

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    if (
      sentimentScoreRange?.min !== undefined ||
      sentimentScoreRange?.max !== undefined
    ) {
      filter.sentimentScore = {};
      if (sentimentScoreRange.min !== undefined) {
        filter.sentimentScore.$gte = sentimentScoreRange.min;
      }
      if (sentimentScoreRange.max !== undefined) {
        filter.sentimentScore.$lte = sentimentScoreRange.max;
      }
    }

    if (createdAtRange?.from || createdAtRange?.to) {
      filter.createdAt = {};
      if (createdAtRange.from) {
        filter.createdAt.$gte = createdAtRange.from;
      }
      if (createdAtRange.to) {
        filter.createdAt.$lte = createdAtRange.to;
      }
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Review.countDocuments(filter).exec(),
    ]);

    return { reviews, total };
  }

  async findById(
    id: string | mongoose.Types.ObjectId
  ): Promise<IReview | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Review.findById(id).exec();
  }

  async findOne(filter: FilterQuery<IReview>): Promise<IReview | null> {
    return Review.findOne(filter).exec();
  }

  async create(data: Partial<IReview>): Promise<IReview> {
    return Review.create(data);
  }

  async deleteById(id: string): Promise<IReview | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Review.findByIdAndDelete(id).exec();
  }
}
