import mongoose, { Document, Schema, Types } from "mongoose";
import { IReviewConfigData, IModelSettings } from "../types/review.config.type";
import { ICriterionDocument } from "./criterion.entity";

export interface IReviewConfigDocument extends IReviewConfigData, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  criteria?: {
    criterionId: mongoose.Types.ObjectId;
    weight: number;
  }[];

  populatedCriteria?: mongoose.Types.Array<ICriterionDocument>;
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
    description: {
      type: String,
      trim: true,
      minlength: 5,
      maxlength: 250,
    },
    criteria: [
      {
        _id: false,
        criterionId: {
          type: Schema.Types.ObjectId,
          ref: "Criteria",
          required: true,
        },
        weight: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
      },
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
reviewConfigSchema.virtual("populatedCriteria", {
  ref: "Criteria",
  localField: "criteria.criterionId",
  foreignField: "_id",
  justOne: false,
});

export const ReviewConfigModel = mongoose.model<IReviewConfigDocument>(
  "ReviewConfig",
  reviewConfigSchema
);
