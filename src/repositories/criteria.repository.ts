import { Service } from "typedi";
import Criterion, { ICriterion } from "../models/criterion.model";
import mongoose, { FilterQuery } from "mongoose";

@Service()
export class CriteriaRepository {
  async findByCompanyId(
    companyId: mongoose.Types.ObjectId,
    search?: string,
    page = 1,
    limit = 20
  ): Promise<{ criteria: ICriterion[]; total: number }> {
    const filter: FilterQuery<ICriterion> = { companyId };

    //search on title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [criteria, total] = await Promise.all([
      Criterion.find(filter).skip(skip).limit(limit).exec(),
      Criterion.countDocuments(filter).exec(),
    ]);

    return { criteria, total };
  }

  async create(data: ICriterion) {
    return data.save();
  }

  async findById(id: string) {
    return Criterion.findById(id);
  }

  async findOne(filter: FilterQuery<ICriterion>) {
    return Criterion.findOne(filter);
  }

  async insertMany(documents: ICriterion[]) {
    return Criterion.insertMany(documents);
  }

  async findManyByIds(ids: mongoose.Types.ObjectId[]): Promise<ICriterion[]> {
    return Criterion.find({
      _id: { $in: ids },
    }).exec();
  }
}
