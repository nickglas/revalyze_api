// src/models/entities/dashboard.metric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  avgOverall: number | null;
  avgSentiment: number | null;
  performanceReviewCount: number;
  sentimentReviewCount: number;
  totalReviewCount: number;
  updatedAt: Date;
}

const DashboardMetricSchema = new Schema<IDashboardMetric>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    avgOverall: { type: Number, default: null },
    avgSentiment: { type: Number, default: null },
    performanceReviewCount: { type: Number, default: 0 },
    sentimentReviewCount: { type: Number, default: 0 },
    totalReviewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// DashboardMetricSchema.index({ companyId: 1 });

export const DashboardMetricModel = mongoose.model<IDashboardMetric>(
  "DashboardMetric",
  DashboardMetricSchema
);
