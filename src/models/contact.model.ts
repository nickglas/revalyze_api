// src/models/contact.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IContact extends Document {
  externalCompanyId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    externalCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalCompany",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 30,
    },
    lastName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
    },
    position: {
      type: String,
      required: false,
      maxlength: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model<IContact>("Contact", contactSchema);
export default Contact;
