// stripe.service.ts
import Stripe from "stripe";
import { Service } from "typedi";

@Service()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: "2025-05-28.basil",
    });
  }

  //get available subscriptions
  async getAvailableSubscriptions() {
    const prices = await this.stripe.prices.list({
      active: true,
      expand: ["data.product"],
    });

    //only get active and non deleted subscriptions
    return prices.data
      .filter((price) => {
        return typeof price.product !== "string" && !price.product.deleted;
      })
      .map((price) => {
        const product = price.product as Stripe.Product;
        return {
          priceId: price.id,
          productId: product.id,
          productName: product.name,
          amount: price.unit_amount,
          interval: price.recurring?.interval,
          metadata: product.metadata,
        };
      });
  }

  //creates a customer within the stripe platform
  async createCustomer(email: string, name: string) {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  //Get customer by name
  async findCustomerByName(name: string): Promise<Stripe.Customer | undefined> {
    const customers = await this.stripe.customers.list({ limit: 100 });

    return customers.data.find(
      (customer) => customer.name?.toLowerCase() === name.toLowerCase()
    );
  }

  //Deletes a Stripe customer by ID
  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    return this.stripe.customers.del(customerId);
  }

  //creates a subscription based on the customer and the selected priceId
  async createSubscription(
    customerId: string,
    priceId: string,
    payment_behavior?: Stripe.SubscriptionCreateParams.PaymentBehavior
  ) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior,
      // Add trial period, payment method, etc if needed
    });
  }

  //create a checkout session based on the customer
  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.stripe.checkout.sessions.create(params);
  }

  //validate stripe webhook call
  constructEvent(payload: Buffer, sig: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, sig, secret);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancel_at_period_end: boolean
  ) {
    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancel_at_period_end,
    });
  }

  async getSubscriptionScheduleById(id: string) {
    return await this.stripe.subscriptionSchedules.retrieve(id);
  }

  public async updateSubscriptionCancellation(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ) {
    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  }

  async getSubscriptionsByCustomer(customerId: string) {
    return await this.stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });
  }

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    options = {}
  ) {
    const subscription = await this.stripe.subscriptions.retrieve(
      subscriptionId
    );

    return await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      ...options,
    });
  }

  // Creates a subscription schedule that upgrades the plan immediately and returns a checkout session
  async createUpgradeSessionWithSchedule(
    customerId: string,
    subscriptionId: string,
    newPriceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const existingSubscription = await this.stripe.subscriptions.retrieve(
      subscriptionId
    );

    // Create a subscription schedule to replace the current pricing
    const schedule = await this.stripe.subscriptionSchedules.create({
      from_subscription: subscriptionId,
      end_behavior: "release",
      phases: [
        {
          items: [
            {
              price: newPriceId,
              quantity: 1,
            },
          ],
        },
      ],
    });

    // Optionally create a Checkout Session to let customer confirm change
    const session = await this.stripe.checkout.sessions.create({
      mode: "setup", // or 'subscription' if you want to start fresh
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      setup_intent_data: {
        metadata: {
          scheduleId: schedule.id,
        },
      },
    });

    return session;
  }

  createSubscriptionSchedule(data: Stripe.SubscriptionScheduleCreateParams) {
    return this.stripe.subscriptionSchedules.create(data);
  }

  async cancelSubscriptionSchedule(
    scheduleId: string
  ): Promise<Stripe.SubscriptionSchedule> {
    return await this.stripe.subscriptionSchedules.release(scheduleId);
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async getSubscriptionPeriodEnd(subscriptionId: string): Promise<number> {
    const subscription = await this.stripe.subscriptions.retrieve(
      subscriptionId
    );

    if (subscription.items.data.length > 0) {
      const item = subscription.items.data[0] as Stripe.SubscriptionItem & {
        current_period_end?: number;
      };

      if (item.current_period_end) {
        return item.current_period_end;
      }
    }

    throw new Error("Unable to retrieve current_period_end for subscription.");
  }

  //check if there exists a product in stripe. Returns a boolean
  async productExistsByName(name: string): Promise<boolean> {
    const products = await this.stripe.products.list({ limit: 100 });
    return products.data.some((p) => p.name === name && !p.deleted);
  }

  //create a new subscription plan
  async createSubscriptionPlan(
    name: string,
    currency: string,
    prices: { interval: "month" | "year"; amount: number }[],
    meta: Record<string, string | number | boolean | undefined> = {},
    features?: string[]
  ) {
    const cleanedMeta = Object.fromEntries(
      Object.entries(meta).filter(([_, v]) => v !== undefined)
    ) as Stripe.MetadataParam;

    const product = await this.stripe.products.create({
      name,
      type: "service",
      metadata: cleanedMeta,
    });

    const createdPrices = await Promise.all(
      prices.map((p) =>
        this.stripe.prices.create({
          product: product.id,
          unit_amount: p.amount,
          currency,
          recurring: { interval: p.interval },
        })
      )
    );

    return { product, prices: createdPrices };
  }

  //get all products
  async getProducts(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list({ limit: 100 });
    return products.data;
  }

  // Retrieve a product by its ID
  async getProductById(productId: string): Promise<Stripe.Product> {
    return this.stripe.products.retrieve(productId);
  }

  // Retrieve price
  async getPriceById(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.retrieve(priceId);
  }

  // Retrieve all active prices for a given product
  async getPricesForProduct(productId: string): Promise<Stripe.Price[]> {
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    });
    return prices.data;
  }

  async addDowngradePhasesToSchedule(
    scheduleId: string,
    subscription: Stripe.Subscription,
    newPriceId: string,
    currentPeriodStart: number,
    currentPeriodEnd: number
  ): Promise<Stripe.SubscriptionSchedule> {
    return this.stripe.subscriptionSchedules.update(scheduleId, {
      end_behavior: "release",
      phases: [
        {
          items: subscription.items.data.map((item) => ({
            price: item.price.id,
            quantity: item.quantity,
          })),
          start_date: currentPeriodStart,
          end_date: currentPeriodEnd,
          proration_behavior: "none",
        },
        {
          items: [
            {
              price: newPriceId,
              quantity: 1,
            },
          ],
          start_date: currentPeriodEnd,
        },
      ],
    });
  }
}
