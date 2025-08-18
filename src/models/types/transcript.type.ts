// src/types/transcript.type.ts
import mongoose from "mongoose";

export enum ReviewStatus {
  NOT_STARTED = "NOT_STARTED",
  STARTED = "STARTED",
  REVIEWED = "REVIEWED",
  ERROR = "ERROR",
}

export interface ITranscriptData {
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  externalCompanyId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  timestampEnd: Date;
  uploadedById: mongoose.Types.ObjectId;
  reviewStatus: ReviewStatus;
  isReviewed: boolean;
}
