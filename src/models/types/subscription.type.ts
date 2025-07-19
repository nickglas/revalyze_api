// src/types/subscription.type.ts
import mongoose from "mongoose";
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
  allowedReviews: number;
  tier: number;
  scheduleId: string;
}

export interface ISubscriptionData {
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
  allowedReviews: number;
  tier: number;

  // New fields for trial subscriptions
  isTrial?: boolean;
  trialStart?: Date;
  trialEndsAt?: Date;
  trialConvertedAt?: Date;
  trialExpired?: boolean;

  scheduledUpdate?: IScheduledUpdate;

  createdAt: Date;
  updatedAt: Date;
}
