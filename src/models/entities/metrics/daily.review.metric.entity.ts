// src/entities/dailyReviewMetric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDailyReviewMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  date: Date;
  avgOverall: number;
  avgSentiment: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReviewMetricSchema = new Schema<IDailyReviewMetric>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    avgOverall: { type: Number, required: true },
    avgSentiment: { type: Number, required: true },
    reviewCount: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

DailyReviewMetricSchema.index({ companyId: 1, date: 1 }, { unique: true });

export const DailyReviewMetricModel = mongoose.model<IDailyReviewMetric>(
  "DailyReviewMetric",
  DailyReviewMetricSchema
);
