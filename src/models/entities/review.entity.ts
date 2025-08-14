// src/entities/review.entity.ts
import mongoose, { Schema, model, Document } from "mongoose";
import {
  IReviewData,
  ICriteriaScore,
  ReviewStatus,
} from "../types/review.type";

export interface IReviewDocument extends IReviewData, Document {
  createdAt: Date;
  updatedAt: Date;
}

const criteriaScoreSchema = new Schema<ICriteriaScore>(
  {
    criterionName: { type: String, required: true, trim: true },
    criterionDescription: { type: String, trim: true },
    score: { type: Number, required: true },
    comment: { type: String, trim: true },
    quote: { type: String, trim: true },
    feedback: { type: String, trim: true },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReviewDocument>(
  {
    transcriptId: {
      type: Schema.Types.ObjectId,
      ref: "Transcript",
      required: true,
      index: true,
    },
    reviewConfig: {
      type: Schema.Types.Mixed,
      required: function () {
        return this.type === "performance" || this.type === "both";
      },
    },
    errorMessage: {
      type: String,
      trim: true,
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
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    criteriaScores: {
      type: [criteriaScoreSchema],
      default: [],
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    overallFeedback: {
      type: String,
      default: "",
      trim: true,
    },
    sentimentScore: {
      type: Number,
      min: 0,
      max: 10,
    },
    sentimentLabel: {
      type: String,
      enum: ["negative", "neutral", "positive"],
    },
    sentimentAnalysis: {
      type: String,
      trim: true,
    },
    externalCompanyId: {
      type: Schema.Types.ObjectId,
      ref: "ExternalCompany",
      required: false,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: false,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

reviewSchema.virtual("reviewConfig.criteria.criterionId", {
  ref: "Criteria",
  localField: "reviewConfig.criteria.criterionId",
  foreignField: "_id",
  justOne: true,
});

reviewSchema.set("toObject", { virtuals: true });
reviewSchema.set("toJSON", { virtuals: true });

export const ReviewModel = model<IReviewDocument>("Review", reviewSchema);
