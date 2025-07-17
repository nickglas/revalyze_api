// src/entities/company.entity.ts
import mongoose, { Schema, model, Document } from "mongoose";
import { ICompanyData } from "../types/company.type";

export interface ICompanyDocument extends ICompanyData, Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  hashedApiKey?: string;
  apiKeyCreatedAt?: Date;
}

const companySchema = new Schema<ICompanyDocument>(
  {
    name: { type: String, required: true },
    mainEmail: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: Schema.Types.Mixed, required: false },
    stripeCustomerId: { type: String, required: false },
    isActive: { type: Boolean, default: true },
    hashedApiKey: { type: String, required: false },
    apiKeyCreatedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

export const CompanyModel = model<ICompanyDocument>("Company", companySchema);
