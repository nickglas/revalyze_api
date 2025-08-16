// src/dto/subscription/subscription.details.dto.ts
export class SubscriptionDetailsDto {
  _id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  productName: string;
  priceId: string;
  productId: string;
  amount: number;
  currency: string;
  interval: string;
  allowedUsers: number;
  allowedTranscripts: number;
  allowedReviews: number;
  tier: number;
  scheduledUpdate?: {
    productName: string;
    effectiveDate: Date;
    priceId: string;
    productId: string;
    amount: number;
    interval: string;
    allowedUsers: number;
    allowedTranscripts: number;
    allowedReviews: number;
    tier: number;
    scheduleId: string;
  };

  constructor(subscription: any) {
    this._id = subscription._id.toString();
    this.status = subscription.status;
    this.currentPeriodStart = subscription.currentPeriodStart;
    this.currentPeriodEnd = subscription.currentPeriodEnd;
    this.cancelAtPeriodEnd = subscription.cancelAtPeriodEnd;
    this.productName = subscription.productName;
    this.priceId = subscription.priceId;
    this.productId = subscription.productId;
    this.amount = subscription.amount;
    this.currency = subscription.currency;
    this.interval = subscription.interval;
    this.allowedUsers = subscription.allowedUsers;
    this.allowedTranscripts = subscription.allowedTranscripts;
    this.allowedReviews = subscription.allowedReviews;
    this.tier = subscription.tier;

    if (subscription.scheduledUpdate) {
      this.scheduledUpdate = {
        productName: subscription.scheduledUpdate.productName,
        effectiveDate: subscription.scheduledUpdate.effectiveDate,
        priceId: subscription.scheduledUpdate.priceId,
        productId: subscription.scheduledUpdate.productId,
        amount: subscription.scheduledUpdate.amount,
        interval: subscription.scheduledUpdate.interval,
        allowedUsers: subscription.scheduledUpdate.allowedUsers,
        allowedTranscripts: subscription.scheduledUpdate.allowedTranscripts,
        allowedReviews: subscription.scheduledUpdate.allowedReviews,
        tier: subscription.scheduledUpdate.tier,
        scheduleId: subscription.scheduledUpdate.scheduleId,
      };
    }
  }
}
