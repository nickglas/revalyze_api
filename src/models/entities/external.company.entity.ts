// src/entities/external.company.entity.ts
import mongoose, { Schema, Document, model } from "mongoose";
import { IExternalCompanyData } from "../types/external.company.type";

export interface IExternalCompanyDocument
  extends IExternalCompanyData,
    Document {
  createdAt: Date;
  updatedAt: Date;
  _id: mongoose.Types.ObjectId;
}

const externalCompanySchema = new Schema<IExternalCompanyDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    address: { type: String, required: true, unique: true },
    isActive: { type: Boolean, required: true, default: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

export const ExternalCompanyModel = model<IExternalCompanyDocument>(
  "ExternalCompany",
  externalCompanySchema
);
