// src/entities/review.entity.ts
import mongoose, { Schema, model, Document } from "mongoose";
import {
  IReviewData,
  ICriteriaScore,
  ReviewStatus,
} from "../types/review.type";
import Container from "typedi";
import { MetricsAggregationService } from "../../services/metrics.aggregation.service";
import { startOfDay } from "date-fns";

export interface IReviewDocument extends IReviewData, Document {
  deletedAt?: Date;
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
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

reviewSchema.pre("findOneAndUpdate", async function (next) {
  this.setOptions({ new: true });
  const oldDoc = await this.model.findOne(this.getQuery()).lean();
  (this as any)._oldDoc = oldDoc;
  next();
});

reviewSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc || doc.reviewStatus !== ReviewStatus.REVIEWED) return;

  const metricsService = Container.get(MetricsAggregationService);
  await metricsService.aggregateDailyMetricsForEntities(
    startOfDay(doc.createdAt),
    { companyId: doc.companyId }
  );
});

reviewSchema.pre("findOneAndDelete", async function (next) {
  const docToDelete = await this.model.findOne(this.getQuery()).lean();
  if (!docToDelete) return next();
  (this as any)._deletedDoc = docToDelete;
  next();
});

reviewSchema.post("findOneAndDelete", async function () {
  const deletedDoc = (this as any)._deletedDoc;
  if (!deletedDoc || deletedDoc.reviewStatus !== ReviewStatus.REVIEWED) return;

  const metricsService = Container.get(MetricsAggregationService);
  await metricsService.aggregateDailyMetricsForEntities(
    startOfDay(deletedDoc.createdAt),
    { companyId: deletedDoc.companyId }
  );
});

reviewSchema.post("save", async function (doc) {
  if (doc.deletedAt || doc.reviewStatus !== ReviewStatus.REVIEWED) return;

  const metricsService = Container.get(MetricsAggregationService);
  await Promise.all([
    metricsService.aggregateDailyMetricsForEntities(startOfDay(doc.createdAt), {
      companyId: doc.companyId,
    }),
    metricsService.updateSentimentLabelMetricsForCompany(doc.companyId),
    metricsService.updateTeamMetricsForCompany(doc.companyId),
  ]);
});

export const ReviewModel = model<IReviewDocument>("Review", reviewSchema);
