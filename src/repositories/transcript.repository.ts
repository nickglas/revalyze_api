import { Service } from 'typedi';
import Transcript, { ITranscript } from '../models/transcript.model';
import mongoose from 'mongoose';

@Service()
export class TranscriptRepository {
  async findById(id: string): Promise<ITranscript | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Transcript.findById(id);
  }

  async findByCompanyId(companyId: string): Promise<ITranscript[]> {
    if (!mongoose.Types.ObjectId.isValid(companyId)) return [];
    return Transcript.find({ companyId }).sort({ timestamp: -1 });
  }

  async create(data: Partial<ITranscript>): Promise<ITranscript> {
    return Transcript.create(data);
  }

  async deleteById(id: string): Promise<ITranscript | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Transcript.findByIdAndDelete(id);
  }

  async countByCompany(companyId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(companyId)) return 0;
    return Transcript.countDocuments({ companyId });
  }
}