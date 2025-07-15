import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import {
  TranscriptModel,
  ITranscriptDocument,
} from "../models/entities/transcript.entity";

type DateRange = { from?: Date; to?: Date };

export interface TranscriptFilterOptions {
  search?: string;
  employeeId?: string;
  externalCompanyId?: string;
  contactId?: string;
  timestampRange?: DateRange;
  createdAtRange?: DateRange;
  page?: number;
  limit?: number;
}

@Service()
export class TranscriptRepository {
  async findByCompanyId(
    companyId: mongoose.Types.ObjectId,
    options: TranscriptFilterOptions = {}
  ): Promise<{ transcripts: ITranscriptDocument[]; total: number }> {
    const {
      search,
      employeeId,
      externalCompanyId,
      contactId,
      timestampRange,
      createdAtRange,
      page = 1,
      limit = 20,
    } = options;

    const filter: FilterQuery<ITranscriptDocument> = { companyId };

    if (search) {
      filter.content = { $regex: search, $options: "i" };
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

    const [transcripts, total] = await Promise.all([
      TranscriptModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      TranscriptModel.countDocuments(filter).exec(),
    ]);

    return { transcripts, total };
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
