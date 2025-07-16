// src/types/review.config.type.ts
import mongoose from "mongoose";
import { ICriterionDocument } from "../entities/criterion.entity";
import { IReviewConfigDocument } from "../entities/review.config.entity";

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

export interface IExpandedReviewConfig extends IReviewConfigDocument {
  criteria: ICriterionDocument[];
}
