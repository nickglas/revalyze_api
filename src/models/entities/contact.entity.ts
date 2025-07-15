// src/entities/contact.entity.ts

import mongoose, { Schema, Document, model } from "mongoose";
import { IContactData } from "../types/contact.type";

export interface IContactDocument extends IContactData, Document {
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContactDocument>(
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

export const ContactModel = model<IContactDocument>("Contact", contactSchema);
