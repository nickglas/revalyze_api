import { Service } from "typedi";
import Company, { ICompany } from "../models/company.model";
import mongoose, { Types, FilterQuery } from "mongoose";

@Service()
export class CompanyRepository {
  async findById(
    id: mongoose.Types.ObjectId | string
  ): Promise<ICompany | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await Company.findById(id).exec();
  }

  async create(companyData: Partial<ICompany>): Promise<ICompany> {
    return await Company.create(companyData);
  }

  async update(
    id: string,
    updateData: Partial<ICompany>
  ): Promise<ICompany | null> {
    return await Company.findByIdAndUpdate(id, updateData, {
      new: true,
    }).exec();
  }

  async findByStripeCustomerId(customerId: string): Promise<ICompany | null> {
    return await Company.findOne({ stripeCustomerId: customerId }).exec();
  }

  async delete(id: string): Promise<void> {
    await Company.findByIdAndDelete(id).exec();
  }

  async findAll(): Promise<ICompany[]> {
    return await Company.find().exec();
  }

  async find(filter: FilterQuery<ICompany>): Promise<ICompany[]> {
    return await Company.find(filter).exec();
  }

  async findOne(filter: FilterQuery<ICompany>): Promise<ICompany | null> {
    return await Company.findOne(filter).exec();
  }
}
