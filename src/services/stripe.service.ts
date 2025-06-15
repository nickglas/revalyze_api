// stripe.service.ts
import Stripe from 'stripe';
import { Service } from 'typedi';

@Service()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  //creates a customer within the stripe platform
  async createCustomer(email: string, name: string) {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  //creates a subscription based on the customer and the selected priceId
  async createSubscription(customerId: string, priceId: string) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: "price_1RX2ooFNTWq4w3FpVnBqcEs6"}],
      // Add trial period, payment method, etc if needed
    });
  }


  // Future:
  async updateSubscription(subscriptionId: string, newPriceId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [{ price: newPriceId }],
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }
}
