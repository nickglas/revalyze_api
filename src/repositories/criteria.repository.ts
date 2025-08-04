import { Service } from "typedi";
import {
  CriterionModel,
  ICriterionDocument,
} from "../models/entities/criterion.entity";
import mongoose, { FilterQuery } from "mongoose";
import { ICriterionData } from "../models/types/criterion.type";

@Service()
export class CriteriaRepository {
  async findByCompanyId(
    companyId: mongoose.Types.ObjectId,
    search?: string,
    page = 1,
    limit = 20
  ): Promise<{ criteria: ICriterionDocument[]; total: number }> {
    const filter: FilterQuery<ICriterionDocument> = { companyId };

    // search on title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [criteria, total] = await Promise.all([
      CriterionModel.find(filter).skip(skip).limit(limit).exec(),
      CriterionModel.countDocuments(filter).exec(),
    ]);

    return { criteria, total };
  }

  async create(data: Partial<ICriterionDocument>) {
    const criterion = new CriterionModel(data);
    return await criterion.save();
  }

  async findById(id: string) {
    return await CriterionModel.findById(id).exec();
  }

  async findOne(filter: FilterQuery<ICriterionDocument>) {
    return await CriterionModel.findOne(filter).exec();
  }

  async update(
    id: string,
    companyId: mongoose.Types.ObjectId,
    updateData: Partial<ICriterionDocument>
  ): Promise<ICriterionDocument | null> {
    return await CriterionModel.findOneAndUpdate(
      { _id: id, companyId },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async insertMany(
    docs: Partial<ICriterionData>[]
  ): Promise<ICriterionDocument[]> {
    const inserted = await CriterionModel.insertMany(docs);
    return inserted as ICriterionDocument[];
  }

  async findManyByIds(
    ids: mongoose.Types.ObjectId[]
  ): Promise<ICriterionDocument[]> {
    return CriterionModel.find({
      _id: { $in: ids },
    }).exec();
  }
}
