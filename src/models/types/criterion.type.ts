// src/types/criterion.type.ts
import mongoose from "mongoose";

export interface ICriterionData {
  companyId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  isActive: boolean;
}

export interface CriteriaFlowData {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  weight: number;
}
