import { Service } from "typedi";
import PendingCompanyRegistration, {
  IPendingCompany,
} from "../models/pendingCompany.model";
import { Types, UpdateQuery } from "mongoose";

@Service()
export class PendingCompanyRepository {
  async create(data: Partial<IPendingCompany>) {
    const pending = new PendingCompanyRegistration(data);
    return pending.save();
  }

  async find() {
    return PendingCompanyRegistration.find();
  }

  async findById(id: string) {
    return PendingCompanyRegistration.findById(id);
  }

  async delete(id: string) {
    return PendingCompanyRegistration.findByIdAndDelete(id);
  }

  async findBySessionId(id: string) {
    return PendingCompanyRegistration.findOne({ stripeSessionId: id });
  }

  async findByStripeId(id: string) {
    return PendingCompanyRegistration.findOne({ stripeCustomerId: id });
  }

  async updateById(id: Types.ObjectId, update: UpdateQuery<IPendingCompany>) {
    return PendingCompanyRegistration.findByIdAndUpdate(id, update, {
      new: true,
    });
  }
}
