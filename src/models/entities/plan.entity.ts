// src/entities/plan.entity.ts
import mongoose, { Document, Schema } from "mongoose";
import { IPlanData, BillingOption } from "../types/plan.type";

export interface IPlanDocument extends IPlanData, Document {
  createdAt: Date;
  updatedAt: Date;
}

const billingOptionSchema = new Schema<BillingOption>(
  {
    interval: {
      type: String,
      enum: ["day", "week", "month", "year", "one_time"],
      required: true,
    },
    stripePriceId: { type: String, required: true },
    amount: { type: Number, required: true },
    tier: { type: Number },
  },
  { _id: false }
);

const planSchema = new Schema<IPlanDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    stripeProductId: { type: String, required: true },
    currency: { type: String, required: true },
    billingOptions: { type: [billingOptionSchema], required: true },
    allowedUsers: { type: Number, required: true },
    allowedTranscripts: { type: Number, required: true },
    allowedReviews: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true, required: true },
    features: [{ type: String }],
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

export const PlanModel = mongoose.model<IPlanDocument>("Plan", planSchema);
