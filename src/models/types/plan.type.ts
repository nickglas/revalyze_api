// src/types/plan.type.ts
export type BillingInterval = "day" | "week" | "month" | "year" | "one_time";

export interface BillingOption {
  interval: BillingInterval;
  stripePriceId: string;
  amount: number;
  tier: number;
}

export interface IPlanData {
  name: string;
  interval: BillingInterval;
  description?: string;
  stripeProductId: string;
  currency: string;
  billingOptions: BillingOption[];
  allowedUsers: number;
  allowedTranscripts: number;
  allowedReviews: number;
  isActive: boolean;
  isVisible: boolean;
  features?: string[];
  metadata?: Record<string, string>;
}
