// src/types/scheduled.update.type.ts
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
