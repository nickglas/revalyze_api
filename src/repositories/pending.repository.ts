import { Service } from "typedi";
import PendingCompanyRegistration, {
  IPendingCompany,
} from "../models/pendingCompany.model";

@Service()
export class PendingCompanyRepository {
  async create(data: Partial<IPendingCompany>) {
    const pending = new PendingCompanyRegistration(data);
    return pending.save();
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
}
