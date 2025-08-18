import mongoose, { Document, Schema, Types } from "mongoose";
import { TeamModel } from "./team.entity";

export interface IDailyTeamMetric extends Document {
  teamId: Types.ObjectId;
  date: Date;
  avgOverall: number;
  avgSentiment: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyTeamMetricSchema = new Schema<IDailyTeamMetric>(
  {
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
      required: true,
      default: 0,
    },
    avgSentiment: {
      type: Number,
      required: true,
      default: 0,
    },
    reviewCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DailyTeamMetricSchema.index({ teamId: 1, date: 1 }, { unique: true });

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
