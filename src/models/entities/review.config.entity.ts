import mongoose, { Document, Schema, Types } from "mongoose";
import { IReviewConfigData, IModelSettings } from "../types/review.config.type";

export interface IReviewConfigDocument extends IReviewConfigData, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const modelSettingsSchema = new Schema<IModelSettings>(
  {
    temperature: { type: Number, min: 0, max: 2 },
    maxTokens: { type: Number, max: 32768 },
  },
  { _id: false, strict: false }
);

const reviewConfigSchema = new Schema<IReviewConfigDocument>(
  {
    name: { type: String, required: true, trim: true },
    criteriaIds: [
      { type: Schema.Types.ObjectId, ref: "Criteria", required: true },
    ],
    modelSettings: { type: modelSettingsSchema, required: true },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ReviewConfigModel = mongoose.model<IReviewConfigDocument>(
  "ReviewConfig",
  reviewConfigSchema
);
