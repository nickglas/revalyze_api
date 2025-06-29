import { Service } from "typedi";
import { StripeService } from "./stripe.service";
import { ICompany } from "../models/company.model";
import Stripe from "stripe";
import { CompanyRepository } from "../repositories/company.repository";
import pendingCompanyModel from "../models/pendingCompany.model";
import userModel from "../models/user.model";
import Subscription, { ISubscription } from "../models/subscription.model";
import { PlanRepository } from "../repositories/plan.repository";
import { CriteriaService } from "./criteria.service";
import { ApiKeyService } from "../services/key.service";
import { logger } from "../utils/logger";
import { ReviewConfigService } from "./review.config.service";
import { PendingCompanyRepository } from "../repositories/pending.repository";
import {
  NotFoundError,
  InternalServerError,
  BadRequestError,
} from "../utils/errors";
import { CompanyService } from "./company.service";

@Service()
export class StripeWebhookService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly companyRepo: CompanyRepository,
    private readonly planRepo: PlanRepository,
    private readonly pendingCompanyRepo: PendingCompanyRepository,
    private readonly companyService: CompanyService,
    private readonly criteriaService: CriteriaService,
    private readonly keyService: ApiKeyService,
    private readonly reviewConfigService: ReviewConfigService
  ) {}

  public async processStripeEvent(event: Stripe.Event): Promise<void> {
    try {
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

        case "checkout.session.expired":
          await this.handleSessionExpired(event);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error: any) {
      logger.error(`Error processing ${event.type} event: ${error.message}`, {
        eventId: event.id,
      });
      throw new InternalServerError(
        `Failed to process event: ${error.message}`
      );
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
      logger.warn("Company not yet found... waiting 5 seconds");
      await new Promise((res) => setTimeout(res, 5000));
    }

    if (!company) {
      logger.warn(`No company found for Stripe customer ${customerId}`);
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

    company.allowedUsers = allowedUsers;
    company.allowedTranscripts = allowedTranscripts;
    await company.save();

    const localSub = await Subscription.findOne({
      stripeSubscriptionId: subscription.id,
    });

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

          if (isCurrentPhaseActive && activePriceId === scheduledPriceId) {
            localSub.scheduledUpdate = undefined;
            await localSub.save();
            logger.info("Cleared scheduledUpdate after downgrade took effect");
          }
        }
      } catch (err) {
        logger.error("Failed to check/clear scheduledUpdate:", err);
      }
    }

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

    logger.info(`Subscription stored/updated for company ${company.name}`);
  }

  //This method gets triggered when a payment session expires.
  //The pending company will be deleted if its found by session id
  private async handleSessionExpired(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    const pendingCompany = await this.pendingCompanyRepo.findBySessionId(
      session.id
    );

    if (!pendingCompany) return;

    await this.pendingCompanyRepo.delete(pendingCompany.id);
    logger.info(`Deleted pending company for expired session ${session.id}`);
  }

  //This methods saves a new company when the checkout is completed.
  //The pending comapny is retrieved and data is copied over.
  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!customerId || !subscriptionId) {
      throw new Error("Missing Stripe customer or subscription ID");
    }

    const pending = await this.pendingCompanyRepo.findByStripeId(customerId);

    if (!pending) {
      logger.warn(`No pending company for customer: ${customerId}`);
      return;
    }

    await this.companyService.activateCompany(pending.id, subscriptionId);
  }

  private async handleProductDeleted(event: Stripe.Event) {
    const product = event.data.object as Stripe.Product;
    const plan = await this.planRepo.findByStripeProductId(product.id);

    if (!plan) {
      logger.warn(`Plan with id ${product.id} not found during deletion`);
      return;
    }

    await this.planRepo.deleteByStripeProductId(product.id);
    logger.info(`Deleted plan for Stripe product ${product.id}`);
  }

  private async handleScheduleChange(event: Stripe.Event) {
    const schedule = event.data.object as Stripe.SubscriptionSchedule;
    const subscriptionId = schedule.subscription as string;

    if (!subscriptionId) {
      logger.warn("Schedule event missing subscription ID");
      return;
    }

    let subscription: ISubscription | null = null;

    for (let i = 0; i < 3; i++) {
      subscription = await Subscription.findOne({
        stripeSubscriptionId: subscriptionId,
      });
      if (subscription) break;
      logger.warn("Subscription not yet found... waiting 5 seconds");
      await new Promise((res) => setTimeout(res, 5000));
    }

    if (!subscription) {
      logger.warn(`No subscription found for subscriptionId ${subscriptionId}`);
      return;
    }

    const upcomingPhase = schedule.phases?.find((phase) => {
      const now = Math.floor(Date.now() / 1000);
      return phase.start_date > now;
    });

    if (!upcomingPhase) {
      logger.warn("No upcoming phase found in subscription schedule");
      subscription.scheduledUpdate = undefined;
      await subscription.save();
      return;
    }

    const priceId = upcomingPhase?.items[0]?.price;
    if (!priceId || typeof priceId !== "string") {
      logger.warn("No priceId found in upcoming phase");
      return;
    }

    try {
      const price = await this.stripeService.getPriceById(priceId);
      const product = await this.stripeService.getProductById(
        price.product as string
      );

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
      logger.info(`Scheduled update saved for subscription ${subscriptionId}`);
    } catch (error: any) {
      logger.error(`Failed to process schedule change: ${error.message}`, {
        subscriptionId,
        scheduleId: schedule.id,
      });
      throw error;
    }
  }

  private async handlePriceEvent(event: Stripe.Event) {
    try {
      const price = event.data.object as Stripe.Price;

      if (!price.product || typeof price.product !== "string") {
        logger.warn(`Price event does not have a valid product ID`);
        return;
      }

      const product = await this.stripeService.getProductById(price.product);

      const simulatedEvent = {
        ...event,
        type: "product.updated",
        data: { object: product },
      } as Stripe.Event;

      await this.handleProductEvent(simulatedEvent);
    } catch (error: any) {
      logger.error(`Error handling price event: ${error.message}`);
      throw error;
    }
  }

  private async handleProductEvent(event: Stripe.Event) {
    try {
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
        logger.warn(`No prices found for product ${product.id}`);
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

      logger.info(`Processed product event for ${product.id}`);
    } catch (error: any) {
      logger.error(`Error handling product event: ${error.message}`);
      throw error;
    }
  }
}
