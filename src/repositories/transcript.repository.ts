import { Service } from "typedi";
import Transcript, { ITranscript } from "../models/transcript.model";
import mongoose, { FilterQuery } from "mongoose";

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
  ): Promise<{ transcripts: ITranscript[]; total: number }> {
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

    const filter: FilterQuery<ITranscript> = { companyId };

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
      if (timestampRange.from) {
        filter.timestamp.$gte = timestampRange.from;
      }
      if (timestampRange.to) {
        filter.timestamp.$lte = timestampRange.to;
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

    const [transcripts, total] = await Promise.all([
      Transcript.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Transcript.countDocuments(filter).exec(),
    ]);

    return { transcripts, total };
  }

  async findById(id: string): Promise<ITranscript | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Transcript.findById(id).exec();
  }

  async findOne(filter: FilterQuery<ITranscript>): Promise<ITranscript | null> {
    return await Transcript.findOne(filter).exec();
  }

  async findManyByIds(ids: mongoose.Types.ObjectId[]): Promise<ITranscript[]> {
    return await Transcript.find({ _id: { $in: ids } }).exec();
  }

  async count(filter: FilterQuery<ITranscript>): Promise<number> {
    return await Transcript.countDocuments(filter).exec();
  }

  async create(data: Partial<ITranscript>): Promise<ITranscript> {
    return await Transcript.create(data);
  }

  async insertMany(documents: ITranscript[]): Promise<ITranscript[]> {
    return await Transcript.insertMany(documents);
  }

  async deleteById(id: string): Promise<ITranscript | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Transcript.findByIdAndDelete(id).exec();
  }

  async countByCompany(companyId: mongoose.Types.ObjectId): Promise<number> {
    return await Transcript.countDocuments({ companyId }).exec();
  }
}
