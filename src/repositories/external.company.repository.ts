import { Service } from "typedi";
import ExternalCompany, {
  IExternalCompany,
} from "../models/external.company.model";
import mongoose, { FilterQuery } from "mongoose";

@Service()
export class ExternalCompanyRepository {
  async findByFilters(
    companyId: mongoose.Types.ObjectId,
    name?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20
  ): Promise<{ companies: IExternalCompany[]; total: number }> {
    const filter: FilterQuery<IExternalCompany> = {};

    filter.companyId = companyId;
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

    const [companies, total] = await Promise.all([
      ExternalCompany.find(filter).skip(skip).limit(limit).exec(),
      ExternalCompany.countDocuments(filter).exec(),
    ]);

    return { companies, total };
  }

  async create(data: IExternalCompany) {
    return data.save();
  }

  async findById(id: mongoose.Types.ObjectId | string) {
    return ExternalCompany.findById(id);
  }

  async findOne(filter: FilterQuery<IExternalCompany>) {
    return ExternalCompany.findOne(filter);
  }

  async update(
    id: mongoose.Types.ObjectId | string,
    updates: Partial<IExternalCompany>
  ) {
    return ExternalCompany.findByIdAndUpdate(id, updates, { new: true }).exec();
  }

  async delete(id: mongoose.Types.ObjectId | string) {
    return ExternalCompany.findByIdAndDelete(id).exec();
  }
}
