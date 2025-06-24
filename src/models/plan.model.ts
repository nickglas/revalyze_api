import mongoose, { Document, Schema } from "mongoose";

export interface BillingOption {
  interval: "day" | "week" | "month" | "year" | "one_time";
  stripePriceId: string; // Stripe Price ID
  amount: number; // Price in smallest currency unit (e.g., cents)
}

export interface IPlan extends Document {
  name: string;
  interval: "day" | "week" | "month" | "year" | "one_time";
  description?: string; // Optional, for UI
  stripeProductId: string; // Shared across billing options
  currency: string; // e.g., 'usd'
  billingOptions: BillingOption[]; // List of billing intervals
  allowedUsers: number; // Internal user limit
  allowedTranscripts: number; // Internal usage limit
  isActive: boolean; // Toggle visibility
  features?: string[]; // Optional feature list for UI
  metadata?: Record<string, string>; // some metadata with key value pair
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
  },
  { _id: false }
);

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    stripeProductId: { type: String, required: true },
    currency: { type: String, required: true },
    billingOptions: { type: [billingOptionSchema], required: true },
    allowedUsers: { type: Number, required: true },
    allowedTranscripts: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    features: [{ type: String }],
  },
  { timestamps: true }
);

const Plan = mongoose.model<IPlan>("Plan", planSchema);
export default Plan;
