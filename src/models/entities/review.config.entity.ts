import mongoose, { Document, Schema, Types } from "mongoose";
import { IReviewConfigData, IModelSettings } from "../types/review.config.type";
import { ICriterionDocument } from "./criterion.entity";

export interface IReviewConfigDocument extends IReviewConfigData, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  criteria?: ICriterionDocument[]; // Add this virtual field
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
  {
    timestamps: true,
    toObject: { virtuals: true }, // Enable virtuals for toObject()
    toJSON: { virtuals: true }, // Enable virtuals for toJSON()
  }
);

// Add virtual population
reviewConfigSchema.virtual("criteria", {
  ref: "Criteria",
  localField: "criteriaIds",
  foreignField: "_id",
  justOne: false,
});

export const ReviewConfigModel = mongoose.model<IReviewConfigDocument>(
  "ReviewConfig",
  reviewConfigSchema
);
