import { Service } from 'typedi';
import Company, { ICompany } from '../models/company.model';
import { Types } from 'mongoose';

@Service()
export class CompanyRepository {
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return Company.findById(id);
  }

  async create(companyData: Partial<ICompany>) {
    return Company.create(companyData);
  }

  async update(id: string, updateData: Partial<ICompany>) {
    return Company.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id: string) {
    return Company.findByIdAndDelete(id);
  }

  async findAll() {
    return Company.find();
  }
}