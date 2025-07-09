import { Service } from "typedi";
import PendingCompanyRegistration, {
  IPendingCompany,
} from "../models/pendingCompany.model";
import { Types, UpdateQuery } from "mongoose";

@Service()
export class PendingCompanyRepository {
  async create(data: Partial<IPendingCompany>) {
    const pending = new PendingCompanyRegistration(data);
    return await pending.save();
  }

  async find() {
    return await PendingCompanyRegistration.find().exec();
  }

  async findById(id: string) {
    return await PendingCompanyRegistration.findById(id).exec();
  }

  async delete(id: string) {
    return await PendingCompanyRegistration.findByIdAndDelete(id).exec();
  }

  async findBySessionId(id: string) {
    return await PendingCompanyRegistration.findOne({
      stripeSessionId: id,
    }).exec();
  }

  async findByStripeId(id: string) {
    return await PendingCompanyRegistration.findOne({
      stripeCustomerId: id,
    }).exec();
  }

  async updateById(id: Types.ObjectId, update: UpdateQuery<IPendingCompany>) {
    return await PendingCompanyRegistration.findByIdAndUpdate(id, update, {
      new: true,
    }).exec();
  }
}
