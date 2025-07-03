import mongoose, { Schema, Document } from "mongoose";
import Stripe from "stripe";

export interface IScheduledUpdate {
  productName: string;
  effectiveDate: Date;
  priceId: string;
  productId: string;
  amount: number;
  interval: Stripe.Price.Recurring.Interval;
  allowedUsers: number;
  allowedTranscripts: number;
  tier: number;
  scheduleId: string;
}

export interface ISubscription extends Document {
  companyId: mongoose.Types.ObjectId;

  stripeSubscriptionId: string;
  stripeCustomerId: string;

  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAt?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;

  priceId: string;
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  interval: Stripe.Price.Recurring.Interval;

  allowedUsers: number;
  allowedTranscripts: number;
  tier: number;

  scheduledUpdate?: IScheduledUpdate;

  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
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
      type: {
        productName: { type: String, required: true },
        effectiveDate: { type: Date, required: true },
        priceId: { type: String, required: true },
        productId: { type: String, required: true },
        amount: { type: Number, required: true },
        interval: { type: String, enum: ["month", "year"], required: true },
        allowedUsers: { type: Number, required: true },
        allowedTranscripts: { type: Number, required: true },
        tier: { type: Number, required: true },
        scheduleId: { type: String, required: true },
      },
      required: false,
    },
  },
  { timestamps: true }
);

const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
export default Subscription;
