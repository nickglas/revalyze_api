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
    const filter: FilterQuery<IReviewConfig> = {
      companyId,
    };

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
    return config.save();
  }

  async findById(id: string) {
    return ReviewConfig.findById(id);
  }

  async findOne(filter: FilterQuery<IReviewConfig>) {
    return ReviewConfig.findOne(filter);
  }

  async update(id: string, update: Partial<IReviewConfig>) {
    return ReviewConfig.findByIdAndUpdate(id, update, { new: true });
  }

  async delete(id: string) {
    return ReviewConfig.findByIdAndDelete(id);
  }

  async insertMany(docs: Partial<IReviewConfig>[]) {
    return ReviewConfig.insertMany(docs);
  }
}
