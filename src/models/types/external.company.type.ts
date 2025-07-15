// src/types/external.company.type.ts
import mongoose from "mongoose";

export interface IExternalCompanyData {
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  companyId: mongoose.Types.ObjectId;
}
