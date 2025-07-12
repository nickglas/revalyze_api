// src/entities/subscription.entity.ts
import mongoose, { Schema, model, Document } from "mongoose";
import { scheduledUpdateSchema } from "./scheduled.update.entity";
import { ISubscriptionData } from "../types/subscription.type";

export interface ISubscriptionDocument extends ISubscriptionData, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },

    stripeSubscriptionId: { type: String, required: true },
    stripeCustomerId: { type: String, required: true },

    status: { type: String, required: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAt: { type: Date },
    canceledAt: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    priceId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "eur" },
    interval: { type: String, enum: ["month", "year"], required: true },

    allowedUsers: { type: Number, required: true },
    allowedTranscripts: { type: Number, required: true },
    tier: { type: Number, required: true },

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
