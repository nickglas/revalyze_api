import mongoose, { Document, Schema, Types } from "mongoose";

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

export interface IReview extends Document {
  transcriptId: Types.ObjectId;
  reviewConfig: object;
  type: "performance" | "sentiment" | "both";
  reviewStatus: ReviewStatus;
  overallScore: number;
  overallFeedback: string;
  criteriaScores: ICriteriaScore[];
  sentimentScore?: number;
  externalCompanyId: Types.ObjectId;
  employeeId: Types.ObjectId;
  clientId: Types.ObjectId;
  companyId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const criteriaScoreSchema = new Schema<ICriteriaScore>(
  {
    criterionName: {
      type: String,
      required: true,
      trim: true,
    },
    criterionDescription: {
      type: String,
      required: false,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
    },
    comment: {
      type: String,
      required: false,
      trim: true,
    },
    quote: {
      type: String,
      required: false,
      trim: true,
    },
    feedback: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReview>(
  {
    transcriptId: {
      type: Schema.Types.ObjectId,
      ref: "Transcript",
      required: true,
      index: true,
    },
    reviewConfig: {
      type: Schema.Types.Mixed,
      required: true,
    },
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.NOT_STARTED,
    },
    type: {
      type: String,
      enum: ["performance", "sentiment", "both"],
      required: true,
    },
    criteriaScores: {
      type: [criteriaScoreSchema],
      required: false,
      default: [],
    },
    overallScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
      default: 0,
    },
    overallFeedback: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },
    sentimentScore: {
      type: Number,
      min: 0,
      max: 10,
      required: false,
    },
    externalCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "ExternalCompany",
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model<IReview>("Review", reviewSchema);
export default Review;
