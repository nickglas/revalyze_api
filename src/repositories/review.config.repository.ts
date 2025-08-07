import { Service } from "typedi";
import mongoose, { FilterQuery, SortOrder } from "mongoose";
import {
  IReviewConfigDocument,
  ReviewConfigModel,
} from "../models/entities/review.config.entity";
import { FilterOptions } from "../services/review.config.service";

@Service()
export class ReviewConfigRepository {
  async findByCompanyIdWithFilters(
    companyId: mongoose.Types.ObjectId,
    {
      name,
      isActive,
      createdAfter,
      page = 1,
      limit = 20,
      sortBy = "name",
      sortOrder = 1 as 1 | -1,
    }: {
      name?: string;
      isActive?: boolean;
      createdAfter?: Date;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 1 | -1;
    }
  ): Promise<{ configs: IReviewConfigDocument[]; total: number }> {
    const filter: FilterQuery<IReviewConfigDocument> = { companyId };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (createdAfter) {
      filter.createdAt = { $gte: createdAfter };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, SortOrder> = {};
    sort[sortBy] = sortOrder;

    const [configs, total] = await Promise.all([
      ReviewConfigModel.find(filter)
        .populate("populatedCriteria")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      ReviewConfigModel.countDocuments(filter).exec(),
    ]);

    return { configs, total };
  }

  async create(data: Partial<IReviewConfigDocument>) {
    const config = new ReviewConfigModel(data);
    return await config.save();
  }

  async findById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ReviewConfigModel.findById(id)
      .populate("populatedCriteria")
      .exec();
  }

  async findOne(filter: FilterQuery<IReviewConfigDocument>) {
    return await ReviewConfigModel.findOne(filter)
      .populate("populatedCriteria")
      .exec();
  }

  async update(
    id: string | mongoose.Types.ObjectId,
    update: Partial<IReviewConfigDocument>
  ) {
    return await ReviewConfigModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec();
  }

  async delete(id: string) {
    return await ReviewConfigModel.findByIdAndDelete(id).exec();
  }

  async insertMany(docs: Partial<IReviewConfigDocument>[]) {
    return await ReviewConfigModel.insertMany(docs);
  }
}
