// src/entities/dailyCriterionMetric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDailyCriterionMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  criterionName: string;
  date: Date;
  avgScore: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyCriterionMetricSchema = new Schema<IDailyCriterionMetric>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    criterionName: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    avgScore: { type: Number, required: true },
    reviewCount: { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for fast queries
DailyCriterionMetricSchema.index({
  companyId: 1,
  criterionName: 1,
  date: 1,
});

export const DailyCriterionMetricModel = mongoose.model<IDailyCriterionMetric>(
  "DailyCriterionMetric",
  DailyCriterionMetricSchema
);
