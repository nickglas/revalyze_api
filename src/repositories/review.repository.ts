import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import { ReviewModel, IReviewDocument } from "../models/entities/review.entity";
import { ReviewStatus } from "../models/types/review.type";
import { ReviewSummaryDto } from "../dto/review/review.summary.dto";

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
  sortBy?: string;
  sortOrder?: number;
  page?: number;
  limit?: number;
}

@Service()
export class ReviewRepository {
  async getAll(
    options: ReviewFilterOptions = {}
  ): Promise<{ reviews: ReviewSummaryDto[]; total: number }> {
    const {
      companyId,
      transcriptId,
      type,
      externalCompanyId,
      employeeId,
      clientId,
      sentimentScoreRange,
      createdAtRange,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = -1,
    } = options;

    const filter: FilterQuery<IReviewDocument> = { companyId };

    const applyIdFilter = (
      field: string,
      value?: string | mongoose.Types.ObjectId
    ) => {
      if (value && mongoose.Types.ObjectId.isValid(value)) {
        filter[field] = new mongoose.Types.ObjectId(value);
      }
    };

    applyIdFilter("transcriptId", transcriptId);
    applyIdFilter("externalCompanyId", externalCompanyId);
    applyIdFilter("employeeId", employeeId);
    applyIdFilter("clientId", clientId);

    if (type) filter.type = type;

    if (
      sentimentScoreRange?.min !== undefined ||
      sentimentScoreRange?.max !== undefined
    ) {
      filter.sentimentScore = {};
      if (sentimentScoreRange.min !== undefined)
        filter.sentimentScore.$gte = sentimentScoreRange.min;
      if (sentimentScoreRange.max !== undefined)
        filter.sentimentScore.$lte = sentimentScoreRange.max;
    }

    if (createdAtRange?.from || createdAtRange?.to) {
      filter.createdAt = {};
      if (createdAtRange.from) filter.createdAt.$gte = createdAtRange.from;
      if (createdAtRange.to) filter.createdAt.$lte = createdAtRange.to;
    }

    const sort: Record<string, any> = { [sortBy]: sortOrder };
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .select(
          "_id reviewStatus type overallScore overallFeedback employeeId createdAt sentimentAnalysis sentimentLabel sentimentScore"
        )
        .populate("employeeId", "_id name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      ReviewModel.countDocuments(filter).exec(),
    ]);

    const summaries: ReviewSummaryDto[] = reviews.map((r: any) => ({
      _id: r._id.toString(),
      reviewStatus: r.reviewStatus,
      type: r.type,
      overallScore: r.overallScore,
      overallFeedback: r.overallFeedback,
      employee: { id: r.employeeId._id.toString(), name: r.employeeId.name },
      createdAt: r.createdAt,
      sentimentAnalysis: r.sentimentAnalysis,
      sentimentLabel: r.sentimentLabel,
      sentimentScore: r.sentimentScore,
    }));

    return { reviews: summaries, total };
  }

  async findRecentByEmployeeId(
    employeeId: string,
    limit: number
  ): Promise<IReviewDocument[]> {
    return await ReviewModel.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("externalCompanyId", "name")
      .lean()
      .exec();
  }

  async findByEmployeeId(employeeId: string): Promise<IReviewDocument[]> {
    return ReviewModel.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      reviewStatus: ReviewStatus.REVIEWED,
    }).exec();
  }

  async countReviewsWithinPeriodByCompany(
    companyId: string | mongoose.Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<number> {
    const filter: FilterQuery<IReviewDocument> = {
      companyId: new mongoose.Types.ObjectId(companyId),
      reviewStatus: { $in: ["STARTED", "REVIEWED"] },
      createdAt: { $gte: from, $lte: to },
    };

    return await ReviewModel.countDocuments(filter).exec();
  }

  async update(
    id: string | mongoose.Types.ObjectId,
    updateData: Partial<IReviewDocument>
  ): Promise<IReviewDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return await ReviewModel.findByIdAndUpdate(id, updateData, {
      new: true,
    }).exec();
  }

  async findById(
    id: string | mongoose.Types.ObjectId
  ): Promise<IReviewDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return await ReviewModel.findById(id)
      .populate("externalCompanyId", "name")
      .populate("employeeId", "name email")
      .populate("clientId", "name email")
      .populate("transcriptId", "content")
      .populate({
        path: "reviewConfig.criteria.criterionId",
        select: "title description",
      })
      .exec();
  }

  async find(filter: FilterQuery<IReviewDocument>): Promise<IReviewDocument[]> {
    return await ReviewModel.find(filter).exec();
  }

  async findOne(
    filter: FilterQuery<IReviewDocument>
  ): Promise<IReviewDocument | null> {
    return await ReviewModel.findOne(filter).exec();
  }

  async create(data: Partial<IReviewDocument>): Promise<IReviewDocument> {
    return await ReviewModel.create(data);
  }

  async deleteById(id: string): Promise<IReviewDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ReviewModel.findByIdAndDelete(id).exec();
  }
}
