import { Service } from "typedi";
import { StripeService } from "./stripe.service";
import Company, { ICompany } from "../models/company.model";
import Stripe from "stripe";
import { CompanyRepository } from "../repositories/company.repository";
import pendingCompanyModel from "../models/pendingCompany.model";
import userModel, { IUser } from "../models/user.model";
import Subscription, { ISubscription } from "../models/subscription.model";
import { PlanRepository } from "../repositories/plan.repository";
import { NotFoundError } from "../utils/errors";
import { CriteriaService } from "./criteria.service";

@Service()
export class StripeWebhookService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly companyRepo: CompanyRepository,
    private readonly planRepo: PlanRepository,
    private readonly criteriaService: CriteriaService
  ) {}

  public async processStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      //for product changes
      case "product.created":
      case "product.updated":
        await this.handleProductEvent(event);
        break;

      case "product.deleted":
        await this.handleProductDeleted(event);
        break;

      //for price changes
      case "price.created":
      case "price.updated":
        await this.handlePriceEvent(event);
        break;

      //for subscription changes
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.handleSubscriptionEvent(event);
        break;

      //scheduler updates
      case "subscription_schedule.created":
      case "subscription_schedule.updated":
      case "subscription_schedule.completed":
        await this.handleScheduleChange(event);
        break;

      //register company when checkout is successful
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  private async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    let company: ICompany | null = null;

    for (let i = 0; i < 3; i++) {
      company = await this.companyRepo.findOne({
        stripeCustomerId: customerId,
      });
      if (company) break;
      console.warn("Company not yet found... waiting 5 seconds");
      await new Promise((res) => setTimeout(res, 5000));
    }

    if (!company) {
      console.warn(`No company found for Stripe customer ${customerId}`);
      return;
    }

    const item = subscription.items.data[0];
    const price = item.price;
    const product = await this.stripeService.getProductById(
      price.product as string
    );

    const allowedUsers = parseInt(product.metadata.allowedUsers || "0", 10);
    const allowedTranscripts = parseInt(
      product.metadata.allowedTranscripts || "0",
      10
    );
    const tier = parseInt(product.metadata.tier || "0", 10);

    // Update limits on the Company model
    company.allowedUsers = allowedUsers;
    company.allowedTranscripts = allowedTranscripts;
    await company.save();

    // Load the local Subscription model (needed to check if scheduledUpdate exists)
    const localSub = await Subscription.findOne({
      stripeSubscriptionId: subscription.id,
    });

    // Check and remove scheduledUpdate if the downgrade has taken effect
    if (localSub?.scheduledUpdate) {
      try {
        const scheduleId = subscription.schedule as string | undefined;

        if (scheduleId) {
          const schedule = await this.stripeService.getSubscriptionScheduleById(
            scheduleId
          );
          const currentPhase = schedule?.phases?.[0];

          const activePriceId = subscription.items.data[0]?.price.id;
          const scheduledPriceId = localSub.scheduledUpdate.priceId;

          const now = Math.floor(Date.now() / 1000);
          const isCurrentPhaseActive = now >= currentPhase.start_date;

          // If the current phase has started and matches the scheduled downgrade, clear the field
          if (isCurrentPhaseActive && activePriceId === scheduledPriceId) {
            localSub.scheduledUpdate = undefined;
            await localSub.save();
            console.log(
              "✅ Cleared scheduledUpdate after downgrade took effect"
            );
          }
        }
      } catch (err) {
        console.error("❌ Failed to check/clear scheduledUpdate:", err);
      }
    }

    // Create or update the Subscription model
    await Subscription.findOneAndUpdate(
      { companyId: company._id },
      {
        companyId: company._id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        status: subscription.status,
        currentPeriodStart: new Date(
          subscription.items.data[0].current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          subscription.items.data[0].current_period_end * 1000
        ),
        cancelAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : undefined,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,

        priceId: price.id,
        productId: product.id,
        productName: product.name,
        amount: price.unit_amount ?? 0,
        currency: price.currency,
        interval: price.recurring?.interval ?? "month",

        allowedUsers,
        allowedTranscripts,
        tier,

        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Subscription stored/updated for company ${company.name}`);
  }

  //This methods saves a new company when the checkout is completed.
  //The pending comapny is retrieved and data is copied over.
  private async handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!customerId) {
      console.warn("Missing Stripe customer ID in checkout.session.completed");
      return;
    }

    const pending = await pendingCompanyModel.findOne({
      stripeCustomerId: customerId,
    });
    if (!pending) {
      console.warn(
        `No pending company registration for Stripe customer ${customerId}`
      );
      return;
    }

    const subscription = await this.stripeService.getSubscription(
      subscriptionId
    );
    const priceId = subscription.items.data[0]?.price?.id;
    const productId = subscription.items.data[0]?.price?.product as string;
    const product = await this.stripeService.getProductById(productId);
    const allowedUsers = parseInt(product.metadata.allowedUsers || "0", 10);
    const allowedTranscripts = parseInt(
      product.metadata.allowedTranscripts || "0",
      10
    );

    const company = await this.companyRepo.create({
      name: pending.companyName,
      mainEmail: pending.companyMainEmail,
      phone: pending.companyPhone,
      address: pending.address,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      isActive: true,
      allowedUsers,
      allowedTranscripts,
    });

    const admin = await userModel.create({
      name: pending.adminName,
      email: pending.adminEmail,
      password: pending.password,
      role: "company_admin",
      companyId: company._id,
    });

    await pending.deleteOne();

    //create default criteria for company
    await this.criteriaService.assignDefaultCriteriaToCompany(company.id);

    console.log(
      `✅ Company ${company.name} and admin ${admin.email} created after checkout.`
    );
  }

  private async handleProductDeleted(event: Stripe.Event) {
    const product = event.data.object as Stripe.Product;

    const plan = await this.planRepo.findByStripeProductId(product.id);

    if (!plan) throw new NotFoundError(`Plan with id ${product.id} not found`);

    await this.planRepo.deleteByStripeProductId(product.id);
  }

  private async handleScheduleChange(event: Stripe.Event) {
    const schedule = event.data.object as Stripe.SubscriptionSchedule;

    // Find subscription by the subscription id from the schedule
    const subscriptionId = schedule.subscription as string;
    if (!subscriptionId) {
      console.warn("Schedule event missing subscription ID");
      return;
    }

    let subscription: ISubscription | null = null;

    for (let i = 0; i < 3; i++) {
      subscription = await Subscription.findOne({
        stripeSubscriptionId: subscriptionId,
      });
      if (subscription) break;
      console.warn("Subscription not yet found... waiting 5 seconds");
      await new Promise((res) => setTimeout(res, 5000)); // wait 5 seconds
    }

    if (!subscription) {
      console.warn(
        `No subscription found for subscriptionId ${subscriptionId}`
      );
      return;
    }

    // You might want to parse the scheduled phases to get the upcoming scheduled update
    const upcomingPhase = schedule.phases?.find((phase) => {
      // phase.start_date is in seconds since epoch
      const now = Math.floor(Date.now() / 1000);
      return phase.start_date > now;
    });

    if (!upcomingPhase) {
      console.warn("No upcoming phase found in subscription schedule");
      // Maybe clear scheduledUpdate if no future phase exists
      subscription.scheduledUpdate = undefined;
      await subscription.save();
      return;
    }

    const priceId = upcomingPhase?.items[0]?.price;
    if (!priceId || typeof priceId !== "string") {
      console.warn("No priceId found in upcoming phase");
      return;
    }

    // Get product details from Stripe
    const price = await this.stripeService.getPriceById(priceId);
    const product = await this.stripeService.getProductById(
      price.product as string
    );

    // Build the scheduledUpdate object for your subscription document
    subscription.scheduledUpdate = {
      effectiveDate: new Date(upcomingPhase.start_date * 1000),
      priceId: price.id,
      productName: product.name,
      productId: product.id,
      amount: price.unit_amount ?? 0,
      interval: price.recurring?.interval === "year" ? "year" : "month",
      allowedUsers: parseInt(product.metadata.allowedUsers || "0", 10),
      allowedTranscripts: parseInt(
        product.metadata.allowedTranscripts || "0",
        10
      ),
      tier: parseInt(product.metadata.tier || "0", 10),
      scheduleId: schedule.id,
    };

    await subscription.save();

    console.log(
      `✅✅✅ Scheduled update saved for subscription ${subscriptionId}`
    );
  }

  private async handlePriceEvent(event: Stripe.Event) {
    const price = event.data.object as Stripe.Price;

    if (!price.product || typeof price.product !== "string") {
      console.warn(`Price event does not have a valid product ID`);
      return;
    }

    const product = await this.stripeService.getProductById(price.product);

    const simulatedEvent = {
      ...event,
      type: "product.updated",
      data: { object: product },
    } as Stripe.Event;

    await this.handleProductEvent(simulatedEvent);
  }

  //This methods saves all the subscription changes to our own database.
  //Stripe is leading, meaning that all data from stripe is right (source of truth)
  private async handleProductEvent(event: Stripe.Event) {
    const product = event.data.object as Stripe.Product;

    const prices = await this.stripeService.getPricesForProduct(product.id);

    const allowedIntervals = [
      "day",
      "week",
      "month",
      "year",
      "one_time",
    ] as const;
    type AllowedInterval = (typeof allowedIntervals)[number];

    const billingOptions = prices.map((p) => {
      if (p.unit_amount === null) {
        throw new Error("Price unit_amount is null");
      }

      const rawInterval = p.recurring?.interval || "one_time";

      const interval: AllowedInterval = allowedIntervals.includes(
        rawInterval as AllowedInterval
      )
        ? (rawInterval as AllowedInterval)
        : "one_time";

      return {
        interval,
        stripePriceId: p.id,
        amount: p.unit_amount,
      };
    });

    if (billingOptions.length === 0) {
      console.warn(`No prices found for product ${product.id}`);
      return;
    }

    const allowedUsers = product.metadata?.allowedUsers
      ? parseInt(product.metadata.allowedUsers, 10)
      : 1;

    const allowedTranscripts = product.metadata?.allowedTranscripts
      ? parseInt(product.metadata.allowedTranscripts, 10)
      : 1;

    const features = product.metadata?.features
      ? JSON.parse(product.metadata.features)
      : [];

    const metadata = product.metadata || {};

    const currency =
      (billingOptions[0] &&
        prices.find((p) => p.id === billingOptions[0].stripePriceId)
          ?.currency) ||
      "eur";

    await this.planRepo.upsert({
      name: product.name,
      stripeProductId: product.id,
      currency,
      allowedUsers,
      isActive: product.active && !product.deleted,
      allowedTranscripts,
      features,
      metadata,
      billingOptions,
    });
  }
}
