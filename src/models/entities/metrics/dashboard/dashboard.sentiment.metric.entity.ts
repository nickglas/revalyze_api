// src/models/entities/dashboard.sentiment.metric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardSentimentMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  negative: number;
  neutral: number;
  positive: number;
  total: number;
  negativePercentage: number;
  neutralPercentage: number;
  positivePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardSentimentMetricSchema = new Schema<IDashboardSentimentMetric>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    negative: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    positive: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    negativePercentage: { type: Number, default: 0 },
    neutralPercentage: { type: Number, default: 0 },
    positivePercentage: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const DashboardSentimentMetricModel =
  mongoose.model<IDashboardSentimentMetric>(
    "DashboardSentimentMetric",
    DashboardSentimentMetricSchema
  );
