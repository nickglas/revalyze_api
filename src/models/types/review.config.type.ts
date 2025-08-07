import mongoose from "mongoose";
import { ICriterionDocument } from "../entities/criterion.entity";

export interface MergedCriterion extends ICriterionDocument {
  weight: number;
  configCriteriaId: mongoose.Types.ObjectId;
}

export interface ExpandedReviewConfigDTO {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  criteria: MergedCriterion[];
  modelSettings: IModelSettings;
  companyId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

export interface IModelSettings {
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

export interface IReviewConfigData {
  name: string;
  criteriaIds: mongoose.Types.ObjectId[];
  modelSettings: IModelSettings;
  companyId: string | mongoose.Types.ObjectId;
  isActive: boolean;
}
