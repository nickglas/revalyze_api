import { Service } from "typedi";
import {
  CriterionModel,
  ICriterionDocument,
} from "../models/entities/criterion.entity";
import mongoose, { FilterQuery } from "mongoose";
import { ICriterionData } from "../models/types/criterion.type";

@Service()
export class CriteriaRepository {
  async findByFilters(
    companyId: mongoose.Types.ObjectId,
    name?: string,
    description?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder: 1 | -1 = -1
  ): Promise<{ criteria: ICriterionDocument[]; total: number }> {
    const filter: FilterQuery<ICriterionDocument> = { companyId };

    if (name) {
      filter.title = { $regex: name, $options: "i" };
    }

    if (description) {
      filter.description = { $regex: description, $options: "i" };
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (createdAfter) {
      filter.createdAt = { $gte: createdAfter };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    const allowedSortFields = ["title", "isActive", "createdAt"];
    const sanitizedSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    sortOptions[sanitizedSortBy] = sortOrder;

    // Pagination
    const skip = (page - 1) * limit;

    console.warn(filter);

    const [criteria, total] = await Promise.all([
      CriterionModel.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
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
    return CriterionModel.find({ _id: { $in: ids } })
      .select("title description")
      .exec();
  }
}
