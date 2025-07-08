import { Service } from "typedi";
import Company, { ICompany } from "../models/company.model";
import mongoose, { Types } from "mongoose";
import { FilterQuery } from "mongoose";

@Service()
export class CompanyRepository {
  async findById(id: mongoose.Types.ObjectId | string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return Company.findById(id);
  }
  async create(companyData: Partial<ICompany>) {
    return Company.create(companyData);
  }

  async update(id: string, updateData: Partial<ICompany>) {
    return Company.findByIdAndUpdate(id, updateData, { new: true });
  }

  async findByStripeCustomerId(customerId: string): Promise<ICompany | null> {
    return Company.findOne({ stripeCustomerId: customerId });
  }

  async delete(id: string): Promise<void> {
    await Company.findByIdAndDelete(id);
  }

  async findAll() {
    return Company.find();
  }

  async find(filter: FilterQuery<ICompany>) {
    return Company.find(filter);
  }

  async findOne(filter: FilterQuery<ICompany>) {
    return Company.findOne(filter);
  }
}
