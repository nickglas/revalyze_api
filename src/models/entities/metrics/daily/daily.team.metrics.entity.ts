// src/models/entities/metrics/daily.team.metrics.entity.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDailyTeamMetric extends Document {
  companyId: Types.ObjectId;
  teamId: Types.ObjectId;
  date: Date;
  avgOverall: number;
  avgSentiment: number;
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

const DailyTeamMetricSchema = new Schema<IDailyTeamMetric>(
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
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    avgOverall: {
      type: Number,
      default: null,
    },
    avgSentiment: {
      type: Number,
      default: null,
    },
    reviewCount: {
      type: Number,
      required: true,
      default: 0,
    },
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

DailyTeamMetricSchema.index(
  { companyId: 1, teamId: 1, date: 1 },
  { unique: true }
);

DailyTeamMetricSchema.virtual("team", {
  ref: "Team",
  localField: "teamId",
  foreignField: "_id",
  justOne: true,
  options: { select: "name" },
});

export const DailyTeamMetricModel = mongoose.model<IDailyTeamMetric>(
  "DailyTeamMetric",
  DailyTeamMetricSchema
);
