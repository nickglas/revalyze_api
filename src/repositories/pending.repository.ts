import { Service } from "typedi";
import {
  IPendingCompanyDocument,
  PendingCompanyModel,
} from "../models/entities/pending.company.entity";
import { FilterQuery, Types, UpdateQuery } from "mongoose";

@Service()
export class PendingCompanyRepository {
  async create(data: Partial<IPendingCompanyDocument>) {
    const pending = new PendingCompanyModel(data);
    return await pending.save();
  }

  async find() {
    return await PendingCompanyModel.find().exec();
  }

  async findOne(filter: FilterQuery<IPendingCompanyDocument>) {
    return await PendingCompanyModel.findOne(filter).exec();
  }

  async findById(id: string) {
    return await PendingCompanyModel.findById(id).exec();
  }

  async delete(id: string) {
    return await PendingCompanyModel.findByIdAndDelete(id).exec();
  }

  async findBySessionId(id: string) {
    return await PendingCompanyModel.findOne({
      stripeSessionId: id,
    }).exec();
  }

  async findByStripeId(id: string) {
    return await PendingCompanyModel.findOne({
      stripeCustomerId: id,
    }).exec();
  }

  async updateById(
    id: Types.ObjectId,
    update: UpdateQuery<IPendingCompanyDocument>
  ) {
    return await PendingCompanyModel.findByIdAndUpdate(id, update, {
      new: true,
    }).exec();
  }
}
