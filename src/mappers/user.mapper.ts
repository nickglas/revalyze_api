// src/mappers/user.mapper.ts
import { Types } from "mongoose";
import { IPendingCompanyDocument } from "../models/entities/pending.company.entity";
import { IUserData } from "../models/types/user.type";

// Maps pending company admin data into a new admin user for creation
export const mapPendingToAdminUser = (
  pending: IPendingCompanyDocument,
  companyId: Types.ObjectId | string
): IUserData => {
  return {
    name: pending.adminName,
    email: pending.adminEmail,
    password: pending.password,
    role: "company_admin",
    companyId: companyId,
    isActive: true,
    activationToken: null,
    isActivated: false,
  };
};
