import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  mainEmail: string;
  phone?: string;
  address?: string;
  subscriptionPlanId: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    mainEmail: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    subscriptionPlanId: { type: String, required: true },
  },
  { timestamps: true }
);

const Company = mongoose.model<ICompany>('Company', companySchema);
export default Company;
