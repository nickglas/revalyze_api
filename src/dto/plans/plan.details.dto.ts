// src/dto/plan/plan.details.dto.ts
export class PlanDetailsDTO {
  _id: string;
  name: string;
  description: string;
  stripeProductId: string;
  currency: string;
  allowedUsers: number;
  allowedTranscripts: number;
  allowedReviews: number;
  billingOptions: BillingOptionDTO[];
  features: string[];

  constructor(plan: any) {
    this._id = plan._id.toString();
    this.name = plan.name;
    this.description = plan.description || "";
    this.stripeProductId = plan.stripeProductId;
    this.currency = plan.currency;
    this.allowedUsers = plan.allowedUsers;
    this.allowedTranscripts = plan.allowedTranscripts;
    this.allowedReviews = plan.allowedReviews;
    this.billingOptions = plan.billingOptions.map((option: any) => ({
      interval: option.interval,
      stripePriceId: option.stripePriceId,
      amount: option.amount,
      tier: option.tier,
    }));
    this.features = plan.features || [];
  }
}

// Add BillingOptionDTO interface
export interface BillingOptionDTO {
  interval: string;
  stripePriceId: string;
  amount: number;
  tier: number;
}
