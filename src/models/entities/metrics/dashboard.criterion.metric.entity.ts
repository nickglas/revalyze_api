// src/models/entities/dashboard.criterion.metric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardCriterionMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  criterionName: string;
  avgScore: number | null;
  reviewCount: number;
  updatedAt: Date;
}

const DashboardCriterionMetricSchema = new Schema<IDashboardCriterionMetric>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    criterionName: {
      type: String,
      required: true,
    },
    avgScore: { type: Number, default: null },
    reviewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
DashboardCriterionMetricSchema.index(
  { companyId: 1, criterionName: 1 },
  { unique: true }
);

export const DashboardCriterionMetricModel =
  mongoose.model<IDashboardCriterionMetric>(
    "DashboardCriterionMetric",
    DashboardCriterionMetricSchema
  );
