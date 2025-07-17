// src/entities/subscription.entity.ts
import mongoose, { Schema, model, Document } from "mongoose";
import { scheduledUpdateSchema } from "./scheduled.update.entity";
import { ISubscriptionData } from "../types/subscription.type";

export interface ISubscriptionDocument extends ISubscriptionData, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },

    // Stripe identifiers – may be empty for trials
    stripeSubscriptionId: { type: String, required: false },
    stripeCustomerId: { type: String, required: false },

    // Trial support
    isTrial: { type: Boolean, default: false },
    trialConvertedAt: { type: Date },
    trialExpired: { type: Boolean, default: false },

    // Subscription info
    status: { type: String, required: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAt: { type: Date },
    canceledAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // Plan
    priceId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "eur" },
    interval: { type: String, enum: ["month", "year"], required: true },

    // Limits
    allowedUsers: { type: Number, required: true },
    allowedTranscripts: { type: Number, required: true },
    allowedReviews: { type: Number, required: true },

    // Updates for the future
    scheduledUpdate: {
      type: scheduledUpdateSchema,
      required: false,
    },
  },
  { timestamps: true }
);

export const SubscriptionModel = model<ISubscriptionDocument>(
  "Subscription",
  subscriptionSchema
);
