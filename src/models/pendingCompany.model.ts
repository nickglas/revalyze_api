import mongoose, { Document, Schema } from "mongoose";

// Interface representing a pending company registration document
export interface IPendingCompany extends Document {
  stripeSessionId: string;
  stripeCustomerId: string;
  stripePaymentLink: string;
  stripeSessionExpiresAtTimestamp: Number;
  companyName?: string;
  companyMainEmail?: string;
  companyPhone?: string;
  address: string;
  adminName: string;
  adminEmail: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const pendingCompanySchema = new Schema<IPendingCompany>(
  {
    stripeSessionId: { type: String, required: true, unique: true },
    stripeCustomerId: { type: String, required: true, unique: true },
    stripePaymentLink: { type: String, required: true, unique: true },
    stripeSessionExpiresAtTimestamp: { type: Number, required: true },
    companyName: { type: String },
    companyMainEmail: { type: String },
    companyPhone: { type: String },
    address: { type: Schema.Types.Mixed },
    adminName: { type: String },
    adminEmail: { type: String },
    password: { type: String },
  },
  { timestamps: true }
);

const PendingCompanyRegistration = mongoose.model<IPendingCompany>(
  "PendingCompanyRegistration",
  pendingCompanySchema
);

export default PendingCompanyRegistration;
