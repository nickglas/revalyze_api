import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import {
  IReviewConfigDocument,
  ReviewConfigModel,
} from "../models/entities/review.config.entity";

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
    }: {
      name?: string;
      isActive?: boolean;
      createdAfter?: string;
      page?: number;
      limit?: number;
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
      const date = new Date(createdAfter);
      if (!isNaN(date.getTime())) {
        filter.createdAt = { $gte: date };
      }
    }

    const skip = (page - 1) * limit;

    const [configs, total] = await Promise.all([
      ReviewConfigModel.find(filter).skip(skip).limit(limit).exec(),
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
    return await ReviewConfigModel.findById(id).exec();
  }

  async findOne(filter: FilterQuery<IReviewConfigDocument>) {
    return await ReviewConfigModel.findOne(filter).exec();
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
