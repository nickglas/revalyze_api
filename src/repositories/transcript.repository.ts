import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import {
  TranscriptModel,
  ITranscriptDocument,
} from "../models/entities/transcript.entity";
import { TranscriptSummaryDto } from "../dto/transcript/transcript.summary.dto";

type DateRange = { from?: Date; to?: Date };

export interface TranscriptFilterOptions {
  search?: string;
  employeeId?: string;
  externalCompanyId?: string;
  contactId?: string;
  timestampRange?: DateRange;
  createdAtRange?: DateRange;
  sortBy?: string;
  sortOrder?: number;
  page?: number;
  limit?: number;
}

@Service()
export class TranscriptRepository {
  async findByCompanyId(
    companyId: mongoose.Types.ObjectId,
    options: TranscriptFilterOptions = {}
  ): Promise<{ transcripts: TranscriptSummaryDto[]; total: number }> {
    const {
      search,
      employeeId,
      externalCompanyId,
      contactId,
      timestampRange,
      createdAtRange,
      page = 1,
      limit = 20,
      sortBy = "timestamp",
      sortOrder = -1,
    } = options;

    const filter: FilterQuery<ITranscriptDocument> = { companyId };

    if (search) {
      filter.$or = [
        { content: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
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

    if (contactId && mongoose.Types.ObjectId.isValid(contactId)) {
      filter.contactId = new mongoose.Types.ObjectId(contactId);
    }

    if (timestampRange?.from || timestampRange?.to) {
      filter.timestamp = {};
      if (timestampRange.from) filter.timestamp.$gte = timestampRange.from;
      if (timestampRange.to) filter.timestamp.$lte = timestampRange.to;
    }

    if (createdAtRange?.from || createdAtRange?.to) {
      filter.createdAt = {};
      if (createdAtRange.from) filter.createdAt.$gte = createdAtRange.from;
      if (createdAtRange.to) filter.createdAt.$lte = createdAtRange.to;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder;

    const [transcripts, total] = await Promise.all([
      TranscriptModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("employeeId", "name")
        .populate("contactId", "email")
        .populate("externalCompanyId", "name")
        .populate("uploadedById", "name")
        .lean()
        .exec(),
      TranscriptModel.countDocuments(filter).exec(),
    ]);

    const transcriptsDto: TranscriptSummaryDto[] = transcripts.map((t) => ({
      id: t._id.toString(),
      uploadedByName:
        typeof t.uploadedById === "object" && "name" in t.uploadedById
          ? (t.uploadedById as any).name
          : null,
      employeeName:
        typeof t.employeeId === "object" && "name" in t.employeeId
          ? (t.employeeId as any).name
          : null,
      contactName:
        typeof t.contactId === "object" && "name" in t.contactId
          ? (t.contactId as any).name
          : (t.contactId as any)?.email || null,
      externalCompany:
        typeof t.externalCompanyId === "object" && "name" in t.externalCompanyId
          ? (t.externalCompanyId as any).name
          : null,
      timestamp: t.timestamp,
      createdAt: t.createdAt,
      reviewStatus: t.reviewStatus,
      isReviewed: t.isReviewed,
      contentPreview:
        t.content?.substring(0, 100) + (t.content?.length > 100 ? "..." : ""),
    }));

    return { transcripts: transcriptsDto, total };
  }

  async findById(id: string): Promise<ITranscriptDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await TranscriptModel.findById(id).exec();
  }

  async findOne(
    filter: FilterQuery<ITranscriptDocument>
  ): Promise<ITranscriptDocument | null> {
    return await TranscriptModel.findOne(filter).exec();
  }

  async findManyByIds(
    ids: mongoose.Types.ObjectId[]
  ): Promise<ITranscriptDocument[]> {
    return await TranscriptModel.find({ _id: { $in: ids } }).exec();
  }

  async count(filter: FilterQuery<ITranscriptDocument>): Promise<number> {
    return await TranscriptModel.countDocuments(filter).exec();
  }

  async create(
    data: Partial<ITranscriptDocument>
  ): Promise<ITranscriptDocument> {
    return await TranscriptModel.create(data);
  }

  async insertMany(
    documents: Partial<ITranscriptDocument>[]
  ): Promise<ITranscriptDocument[]> {
    const result = await TranscriptModel.insertMany(documents);
    return result as ITranscriptDocument[];
  }

  async deleteById(id: string): Promise<ITranscriptDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await TranscriptModel.findByIdAndDelete(id).exec();
  }

  async countByCompany(companyId: mongoose.Types.ObjectId): Promise<number> {
    return await TranscriptModel.countDocuments({ companyId }).exec();
  }
}
