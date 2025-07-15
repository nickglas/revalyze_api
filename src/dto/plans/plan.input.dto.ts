export type PlanInput = {
  name: string;
  stripeProductId: string;
  currency: string;
  allowedUsers: number;
  allowedTranscripts: number;
  features?: string[];
  isActive: boolean;
  metadata?: Record<string, string>;
  billingOptions: {
    interval: "day" | "week" | "month" | "year" | "one_time";
    stripePriceId: string;
    amount: number;
  }[];
};
