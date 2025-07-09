import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import ReviewConfig, { IReviewConfig } from "../models/review.config.model";

@Service()
export class ReviewConfigRepository {
  async findByCompanyIdWithFilters(
    companyId: mongoose.Types.ObjectId,
    {
      name,
      active,
      createdAfter,
      page = 1,
      limit = 20,
    }: {
      name?: string;
      active?: boolean;
      createdAfter?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ configs: IReviewConfig[]; total: number }> {
    const filter: FilterQuery<IReviewConfig> = { companyId };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (typeof active === "boolean") {
      filter.active = active;
    }

    if (createdAfter) {
      const date = new Date(createdAfter);
      if (!isNaN(date.getTime())) {
        filter.createdAt = { $gte: date };
      }
    }

    const skip = (page - 1) * limit;

    const [configs, total] = await Promise.all([
      ReviewConfig.find(filter).skip(skip).limit(limit).exec(),
      ReviewConfig.countDocuments(filter).exec(),
    ]);

    return { configs, total };
  }

  async create(data: Partial<IReviewConfig>) {
    const config = new ReviewConfig(data);
    return await config.save();
  }

  async findById(id: string) {
    return await ReviewConfig.findById(id).exec();
  }

  async findOne(filter: FilterQuery<IReviewConfig>) {
    return await ReviewConfig.findOne(filter).exec();
  }

  async update(
    id: string | mongoose.Types.ObjectId,
    update: Partial<IReviewConfig>
  ) {
    return await ReviewConfig.findByIdAndUpdate(id, update, {
      new: true,
    }).exec();
  }

  async delete(id: string) {
    return await ReviewConfig.findByIdAndDelete(id).exec();
  }

  async insertMany(docs: Partial<IReviewConfig>[]) {
    return await ReviewConfig.insertMany(docs);
  }
}
