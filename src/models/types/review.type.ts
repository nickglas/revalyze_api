// src/types/review.type.ts
import mongoose from "mongoose";
import { IReviewConfigDocument } from "../entities/review.config.entity";
import { IExpandedReviewConfig } from "./review.config.type";

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
  reviewConfig: IReviewConfigDocument | IExpandedReviewConfig;
  type: "performance" | "sentiment" | "both";
  reviewStatus: ReviewStatus;
  overallScore: number;
  overallFeedback: string;
  criteriaScores: ICriteriaScore[];
  sentimentScore?: number;
  sentimentLabel?: "negative" | "neutral" | "positive";
  sentimentAnalysis?: string;
  externalCompanyId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
}
