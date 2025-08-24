// src/models/entities/metrics/dashboard.employee.metric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardEmployeeMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  avgOverall: number | null;
  avgSentiment: number | null;
  reviewCount: number;
  empathie: number | null;
  oplossingsgerichtheid: number | null;
  professionaliteit: number | null;
  klanttevredenheid: number | null;
  sentimentKlant: number | null;
  helderheidEnBegrijpelijkheid: number | null;
  responsiviteitLuistervaardigheid: number | null;
  tijdsefficientieDoelgerichtheid: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardEmployeeMetricSchema = new Schema<IDashboardEmployeeMetric>(
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
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    avgOverall: { type: Number, default: null },
    avgSentiment: { type: Number, default: null },
    reviewCount: { type: Number, default: 0 },
    empathie: { type: Number, default: null },
    oplossingsgerichtheid: { type: Number, default: null },
    professionaliteit: { type: Number, default: null },
    klanttevredenheid: { type: Number, default: null },
    sentimentKlant: { type: Number, default: null },
    helderheidEnBegrijpelijkheid: { type: Number, default: null },
    responsiviteitLuistervaardigheid: { type: Number, default: null },
    tijdsefficientieDoelgerichtheid: { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DashboardEmployeeMetricSchema.index(
  { companyId: 1, employeeId: 1 },
  { unique: true }
);

DashboardEmployeeMetricSchema.virtual("employee", {
  ref: "User",
  localField: "employeeId",
  foreignField: "_id",
  justOne: true,
  options: { select: "name email" },
});

DashboardEmployeeMetricSchema.virtual("team", {
  ref: "Team",
  localField: "teamId",
  foreignField: "_id",
  justOne: true,
  options: { select: "name" },
});

export const DashboardEmployeeMetricModel =
  mongoose.model<IDashboardEmployeeMetric>(
    "DashboardEmployeeMetric",
    DashboardEmployeeMetricSchema
  );
