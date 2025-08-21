// src/models/entities/metrics/dashboard.team.metric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardTeamMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  avgOverall: number | null;
  avgSentiment: number | null;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardTeamMetricSchema = new Schema<IDashboardTeamMetric>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    avgOverall: { type: Number, default: null },
    avgSentiment: { type: Number, default: null },
    reviewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DashboardTeamMetricSchema.index({ companyId: 1, teamId: 1 }, { unique: true });

DashboardTeamMetricSchema.virtual("team", {
  ref: "Team",
  localField: "teamId",
  foreignField: "_id",
  justOne: true,
  options: { select: "name" },
});

export const DashboardTeamMetricModel = mongoose.model<IDashboardTeamMetric>(
  "DashboardTeamMetric",
  DashboardTeamMetricSchema
);
