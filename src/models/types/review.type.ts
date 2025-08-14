// src/types/review.type.ts
import mongoose from "mongoose";
import { IModelSettings } from "./review.config.type";

export enum ReviewStatus {
  NOT_STARTED = "NOT_STARTED",
  STARTED = "STARTED",
  REVIEWED = "REVIEWED",
  ERROR = "ERROR",
}

export interface ICriteriaScore {
  criterionName: string;
  criterionDescription?: string;
  score: number;
  comment?: string;
  quote?: string;
  feedback?: string;
}

export interface IReviewData {
  transcriptId: mongoose.Types.ObjectId;
  reviewConfig?: IStoredReviewConfig;
  type: "performance" | "sentiment" | "both";
  subject?: string;
  reviewStatus: ReviewStatus;
  overallScore: number;
  overallFeedback: string;
  criteriaScores: ICriteriaScore[];
  sentimentScore?: number;
  sentimentLabel?: "negative" | "neutral" | "positive";
  sentimentAnalysis?: string;
  externalCompanyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  errorMessage: String;
}

export interface IReviewConfigForProcessing {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  modelSettings: IModelSettings;
  mergedCriteria: {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    weight: number;
  }[];
}

export interface IStoredReviewConfigCriteria {
  criterionId: mongoose.Types.ObjectId;
  weight: number;
  title: string;
  description: string;
}

export interface IStoredReviewConfig {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  modelSettings: IModelSettings;
  criteria?: IStoredReviewConfigCriteria[];
}
