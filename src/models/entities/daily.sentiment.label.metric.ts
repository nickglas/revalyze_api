import { Schema, model, Document, Types } from "mongoose";

export interface IDailySentimentLabelMetric extends Document {
  date: Date;
  negative: number;
  neutral: number;
  positive: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailySentimentLabelMetricSchema = new Schema<IDailySentimentLabelMetric>(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
      index: true,
    },
    negative: {
      type: Number,
      default: 0,
    },
    neutral: {
      type: Number,
      default: 0,
    },
    positive: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DailySentimentLabelMetricSchema.virtual("negativePercentage").get(function () {
  return this.total > 0
    ? parseFloat(((this.negative / this.total) * 100).toFixed(1))
    : 0;
});

DailySentimentLabelMetricSchema.virtual("neutralPercentage").get(function () {
  return this.total > 0
    ? parseFloat(((this.neutral / this.total) * 100).toFixed(1))
    : 0;
});

DailySentimentLabelMetricSchema.virtual("positivePercentage").get(function () {
  return this.total > 0
    ? parseFloat(((this.positive / this.total) * 100).toFixed(1))
    : 0;
});

export const DailySentimentLabelMetricModel = model<IDailySentimentLabelMetric>(
  "DailySentimentLabelMetric",
  DailySentimentLabelMetricSchema
);
