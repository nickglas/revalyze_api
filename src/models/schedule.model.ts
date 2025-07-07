// src/models/scheduled.model.ts
import { Schema } from "mongoose";
import Stripe from "stripe";

export const scheduledUpdateSchema = new Schema(
  {
    productName: { type: String, required: true },
    effectiveDate: { type: Date, required: true },
    priceId: { type: String, required: true },
    productId: { type: String, required: true },
    amount: { type: Number, required: true },
    interval: {
      type: String,
      enum: ["month", "year"],
      required: true,
    },
    allowedUsers: { type: Number, required: true },
    allowedTranscripts: { type: Number, required: true },
    tier: { type: Number, required: true },
    scheduleId: { type: String, required: true },
  },
  { _id: false }
);
