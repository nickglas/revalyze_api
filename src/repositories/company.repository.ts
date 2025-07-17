// src/repositories/company.repository.ts
import { Service } from "typedi";
import mongoose, { Types, FilterQuery, ClientSession } from "mongoose";
import {
  ICompanyDocument,
  CompanyModel,
} from "../models/entities/company.entity";

@Service()
export class CompanyRepository {
  async findById(
    id: mongoose.Types.ObjectId | string
  ): Promise<ICompanyDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await CompanyModel.findById(id).exec();
  }

  async create(
    companyData: Partial<ICompanyDocument>,
    session?: ClientSession
  ): Promise<ICompanyDocument> {
    if (session) {
      const docs = await CompanyModel.create([companyData], { session });
      return docs[0];
    }
    return await CompanyModel.create(companyData);
  }

  async update(
    id: string,
    updateData: Partial<ICompanyDocument>,
    session?: ClientSession
  ): Promise<ICompanyDocument | null> {
    if (session) {
      return await CompanyModel.findByIdAndUpdate(id, updateData, {
        new: true,
        session,
      }).exec();
    }
    return await CompanyModel.findByIdAndUpdate(id, updateData, {
      new: true,
    }).exec();
  }

  async findByStripeCustomerId(
    customerId: string
  ): Promise<ICompanyDocument | null> {
    return await CompanyModel.findOne({ stripeCustomerId: customerId }).exec();
  }

  async delete(id: string, session?: ClientSession): Promise<void> {
    if (session) {
      await CompanyModel.findByIdAndDelete(id, { session }).exec();
    } else {
      await CompanyModel.findByIdAndDelete(id).exec();
    }
  }

  async findAll(): Promise<ICompanyDocument[]> {
    return await CompanyModel.find().exec();
  }

  async find(
    filter: FilterQuery<ICompanyDocument>
  ): Promise<ICompanyDocument[]> {
    return await CompanyModel.find(filter).exec();
  }

  async findOne(
    filter: FilterQuery<ICompanyDocument>
  ): Promise<ICompanyDocument | null> {
    return await CompanyModel.findOne(filter).exec();
  }
}
