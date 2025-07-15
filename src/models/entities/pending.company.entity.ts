// src/entities/pending.company.entity.ts
import { Schema, model, Document } from "mongoose";
import { IPendingCompanyData } from "../types/pending.company.type";

export interface IPendingCompanyDocument extends IPendingCompanyData, Document {
  createdAt: Date;
  updatedAt: Date;
}

const pendingCompanySchema = new Schema<IPendingCompanyDocument>(
  {
    stripeSessionId: { type: String, required: true, unique: true },
    stripeCustomerId: { type: String, required: true, unique: true },
    stripePaymentLink: { type: String, required: true, unique: true },
    stripeSessionExpiresAtTimestamp: { type: Number, required: true },
    companyName: { type: String, required: true },
    companyMainEmail: { type: String, required: true },
    companyPhone: { type: String },
    address: { type: Schema.Types.Mixed },
    adminName: { type: String, required: true },
    adminEmail: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    lastAttempt: { type: Date },
    attemptCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PendingCompanyModel = model<IPendingCompanyDocument>(
  "PendingCompanyRegistration",
  pendingCompanySchema
);
