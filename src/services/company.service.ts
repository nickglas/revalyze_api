import { Types } from 'mongoose';
import Company, { ICompany } from '../models/company.model';
import User from '../models/user.model';
import bcrypt from 'bcryptjs';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { CompanyRepository } from '../repositories/company.repository';
import { StripeService } from './stripe.service';
import { Service } from 'typedi';

@Service()
export class CompanyService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly companyRepository: CompanyRepository
  ) {}

  async registerCompany(companyData: any){
    const existing = await Company.findOne({ mainEmail: companyData.companyMainEmail });
    if (existing) {
      throw new BadRequestError('Company with this email already exists');
    }

    const {
      companyName,
      companyMainEmail,
      companyPhone,
      address,
      subscriptionPlanId,
      adminName,
      adminEmail,
      password,
      repeatPassword,
    } = companyData;

    if (!adminName || !adminEmail || !password || !repeatPassword) {
      throw new BadRequestError('Admin user information is incomplete');
    }

    if (password !== repeatPassword) {
      throw new BadRequestError('Passwords do not match');
    }

    const company = new Company({
      name: companyName,
      mainEmail: companyMainEmail,
      phone: companyPhone,
      address,
      subscriptionPlanId,
    });

    const savedCompany = await company.save();

    const user = new User({
      name: adminName,
      email: adminEmail,
      password: password,
      role: 'company_admin',
      companyId: savedCompany._id,
    });

    await user.save();

    return savedCompany;
  };

  async getCompanyById(companyId: string){
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestError('Invalid company ID');
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  };

  async updateCompanyById(userId: string, companyId: string, updates: Partial<any>){
    //validations of id's
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestError('Invalid company or user ID');
    }

    //check if the user exists
    const user = await User.findById(userId);
    if (!user){
      throw new NotFoundError('User not found');
    }

    //check if the user is an admin & the user is actually admin of the specfied company
    if (user.role !== 'company_admin' || user.companyId.toString() !== companyId) {
      throw new UnauthorizedError('Unauthorized to update this company');
    }

    //check if the fields are valid
    const allowedFields = ['mainEmail', 'phone', 'address'];
    const filteredUpdates: Partial<any> = {};
    for (const key of allowedFields) {
      if (updates[key]) {
        filteredUpdates[key] = updates[key];
      }
    }

    const updatedCompany = await Company.findByIdAndUpdate(companyId, filteredUpdates, { new: true });
    if (!updatedCompany) {
      throw new NotFoundError('Company not found');
    }

    return updatedCompany;
  };

  async updateSubscription (companyId: string, subscriptionPlanId: string){
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestError('Invalid company ID');
    }

    const updated = await Company.findByIdAndUpdate(companyId, { subscriptionPlanId }, { new: true });
    if (!updated) {
      throw new NotFoundError('Company not found');
    }

    return updated;
  };

}
