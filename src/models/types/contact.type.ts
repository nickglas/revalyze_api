// src/types/contact.type.ts

import mongoose from "mongoose";

export interface IContactData {
  externalCompanyId: mongoose.Types.ObjectId | string;
  companyId: mongoose.Types.ObjectId | string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
