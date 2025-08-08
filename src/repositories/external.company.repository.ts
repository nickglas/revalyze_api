import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import {
  IExternalCompanyDocument,
  ExternalCompanyModel,
} from "../models/entities/external.company.entity";

@Service()
export class ExternalCompanyRepository {
  async findByFilters(
    companyId: mongoose.Types.ObjectId,
    name?: string,
    email?: string,
    phone?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortOrder = 1
  ): Promise<{ companies: IExternalCompanyDocument[]; total: number }> {
    const filter: FilterQuery<IExternalCompanyDocument> = { companyId };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    if (phone) {
      filter.phone = { $regex: phone, $options: "i" };
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (createdAfter) {
      filter.createdAt = { $gte: createdAfter };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder;

    const [companies, total] = await Promise.all([
      ExternalCompanyModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      ExternalCompanyModel.countDocuments(filter).exec(),
    ]);

    return { companies, total };
  }

  async create(data: Partial<IExternalCompanyDocument>) {
    return await ExternalCompanyModel.create(data);
  }

  async findById(id: mongoose.Types.ObjectId | string) {
    return await ExternalCompanyModel.findById(id).exec();
  }

  async findOne(filter: FilterQuery<IExternalCompanyDocument>) {
    return await ExternalCompanyModel.findOne(filter).exec();
  }

  async update(
    id: mongoose.Types.ObjectId | string,
    updates: Partial<IExternalCompanyDocument>
  ) {
    return await ExternalCompanyModel.findByIdAndUpdate(id, updates, {
      new: true,
    }).exec();
  }

  async delete(id: mongoose.Types.ObjectId | string) {
    return await ExternalCompanyModel.findByIdAndDelete(id).exec();
  }
}
