import mongoose, { Document, Schema, Types } from "mongoose";

export interface ModelSettings {
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

export interface IReviewConfig extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  criteriaIds: Types.ObjectId[];
  modelSettings: ModelSettings;
  companyId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const modelSettingsSchema = new Schema<ModelSettings>(
  {
    temperature: { type: Number, min: 0, max: 2 },
    maxTokens: { type: Number, max: 32768 },
  },
  {
    _id: false,
    strict: false,
  }
);

const reviewConfigurationSchema = new Schema<IReviewConfig>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    criteriaIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Criteria",
        required: true,
      },
    ],
    modelSettings: {
      type: modelSettingsSchema,
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const ReviewConfig = mongoose.model<IReviewConfig>(
  "ReviewConfig",
  reviewConfigurationSchema
);
export default ReviewConfig;
