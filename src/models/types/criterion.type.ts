// src/types/criterion.type.ts
import mongoose from "mongoose";

export interface ICriterionData {
  companyId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  isActive: boolean;
}
