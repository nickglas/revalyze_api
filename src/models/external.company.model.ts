import mongoose, { Document, Schema } from "mongoose";

export interface IExternalCompany extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  companyId: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const externalCompanySchema = new Schema<IExternalCompany>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    address: { type: String, required: true, unique: true },
    isActive: { type: Boolean, required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

const ExternalCompany = mongoose.model<IExternalCompany>(
  "ExternalCompany",
  externalCompanySchema
);
export default ExternalCompany;
