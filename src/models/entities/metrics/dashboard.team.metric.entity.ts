// src/models/entities/metrics/dashboard.team.metric.entity.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDashboardTeamMetric extends Document {
  companyId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
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
