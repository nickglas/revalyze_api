import mongoose, { Document, Schema } from "mongoose";

export interface ICompany extends Document {
  name: string;
  mainEmail: string;
  phone?: string;
  address?: string;
  stripeCustomerId: string;
  isActive: boolean;

  hashedApiKey?: string;
  apiKeyCreatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    mainEmail: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    isActive: { type: Boolean },
    stripeCustomerId: { type: String, required: true },

    hashedApiKey: { type: String, required: false },
    apiKeyCreatedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

const Company = mongoose.model<ICompany>("Company", companySchema);
export default Company;
