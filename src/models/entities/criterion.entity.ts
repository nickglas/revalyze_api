// src/entities/criterion.entity.ts
import mongoose, { Schema, Document, model, Types } from "mongoose";
import { ICriterionData } from "../types/criterion.type";

export interface ICriterionDocument extends ICriterionData, Document {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const criterionSchema = new Schema<ICriterionDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

export const CriterionModel = model<ICriterionDocument>(
  "Criterion",
  criterionSchema
);
