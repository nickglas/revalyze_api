import { Service } from "typedi";
import { StripeService } from "./stripe.service";
import Stripe from "stripe";
import { CompanyRepository } from "../repositories/company.repository";
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
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { ICompanyDocument } from "../models/entities/company.entity";
import { ISubscriptionDocument } from "../models/entities/subscription.entity";

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
    private readonly reviewConfigService: ReviewConfigService,
    private readonly subscriptionRepository: SubscriptionRepository
  ) {}

  public async processStripeEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "product.created":
        case "product.updated":
          await this.handleProductEvent(event);
          break;

        case "product.deleted":
          await this.handleProductDeleted(event);
          break;

        case "price.created":
        case "price.updated":
          await this.handlePriceEvent(event);
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await this.handleSubscriptionEvent(event);
          break;

        case "subscription_schedule.created":
        case "subscription_schedule.updated":
        case "subscription_schedule.completed":
        case "subscription_schedule.canceled":
        case "subscription_schedule.released":
          await this.handleScheduleChange(event);
          break;

        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event);
          break;

        case "checkout.session.expired":
          await this.handleSessionExpired(event);
          break;

        default:
          logger.info(`Unhandled event type ${event.type}`);
      }
    } catch (error: any) {
      logger.error(`Error processing ${event.type} event: ${error.message}`, {
        eventId: event.id,
        stack: error.stack,
      });
      throw new InternalServerError(
        `Failed to process event: ${error.message}`
      );
    }
  }

  private async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    const stripeSubscription = event.data.object as Stripe.Subscription;
    const customerId = stripeSubscription.customer as string;

    let company: ICompanyDocument | null = null;

    // Retry mechanism for eventual consistency
    for (let i = 0; i < 3; i++) {
      company = await this.companyRepo.findOne({
        stripeCustomerId: customerId,
      });
      if (company) break;
      logger.warn("Company not yet found... waiting 5 seconds");
      await new Promise((res) => setTimeout(res, 5000));
    }

    if (!company) {
      logger.error(`No company found for Stripe customer ${customerId}`);
      return;
    }

    const item = stripeSubscription.items.data[0];
    const price = item.price;
    const product = await this.stripeService.getProductById(
      price.product as string
    );

    // Handle immediate upgrades (clear scheduled downgrades)
    if (event.type === "customer.subscription.updated") {
      await this.clearScheduledUpdates(stripeSubscription, company);
    }

    // Create/update subscription record
    await this.upsertSubscription(stripeSubscription, company, product, price);
  }

  // NEW: Clear scheduled updates when upgrading immediately
  private async clearScheduledUpdates(
    stripeSubscription: Stripe.Subscription,
    company: ICompanyDocument
  ) {
    const localSub =
      await this.subscriptionRepository.findByStripeSubscriptionId(
        stripeSubscription.id
      );

    if (localSub?.scheduledUpdate) {
      const activePriceId = stripeSubscription.items.data[0]?.price.id;
      const scheduledPriceId = localSub.scheduledUpdate.priceId;
      const now = Date.now();

      // If current price doesn't match scheduled price = immediate upgrade
      if (activePriceId !== scheduledPriceId) {
        try {
          // RELEASE schedule instead of canceling
          await this.stripeService.releaseSubscriptionSchedule(
            localSub.scheduledUpdate.scheduleId
          );

          logger.info(
            `Released schedule ${localSub.scheduledUpdate.scheduleId} for immediate upgrade`
          );
        } catch (err: any) {
          logger.error(`Failed to release schedule: ${err.message}`, {
            scheduleId: localSub.scheduledUpdate.scheduleId,
          });
        }

        // Clear scheduled update in our system
        localSub.scheduledUpdate = undefined;
        await localSub.save();
        logger.info(
          `Cleared scheduled downgrade for immediate upgrade to ${activePriceId}`
        );
      }
    }
  }

  private async upsertSubscription(
    stripeSubscription: Stripe.Subscription,
    company: ICompanyDocument,
    product: Stripe.Product,
    price: Stripe.Price
  ) {
    const allowedUsers = parseInt(product.metadata.allowedUsers || "0", 10);
    const allowedTranscripts = parseInt(
      product.metadata.allowedTranscripts || "0",
      10
    );
    const tier = parseInt(product.metadata.tier || "0", 10);

    await this.subscriptionRepository.upsertByCompanyId(company._id, {
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(
        stripeSubscription.items.data[0].current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        stripeSubscription.items.data[0].current_period_end * 1000
      ),
      cancelAt: stripeSubscription.cancel_at
        ? new Date(stripeSubscription.cancel_at * 1000)
        : undefined,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : undefined,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,

      priceId: price.id,
      productId: product.id,
      productName: product.name,
      amount: price.unit_amount ?? 0,
      currency: price.currency,
      interval: price.recurring?.interval,

      allowedUsers,
      allowedTranscripts,
    });
  }

  private async handleSessionExpired(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const pendingCompany = await this.pendingCompanyRepo.findBySessionId(
      session.id
    );

    if (!pendingCompany) return;

    await this.pendingCompanyRepo.delete(pendingCompany.id);
    logger.info(`Deleted pending company for expired session ${session.id}`);
  }

  private async handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!customerId || !subscriptionId) {
      throw new BadRequestError("Missing Stripe customer or subscription ID");
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

    let subscription: ISubscriptionDocument | null = null;

    // Retry mechanism for eventual consistency
    for (let i = 0; i < 3; i++) {
      subscription = await this.subscriptionRepository.findOne({
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

    // Fetch full Stripe subscription to access test_clock (if any)
    const stripeSubscription = await this.stripeService.getSubscription(
      subscriptionId
    );

    let now = Math.floor(Date.now() / 1000); // Default to real time

    if (stripeSubscription.test_clock) {
      try {
        const clock = await this.stripeService.getTestClockById(
          stripeSubscription.test_clock as string
        );
        now = clock.frozen_time;
        logger.info(`Using test clock time: ${now}`);
      } catch (err: any) {
        logger.warn(
          `Failed to fetch test clock, using real time instead: ${err.message}`
        );
      }
    }

    // Handle canceled or released schedules
    if (
      event.type === "subscription_schedule.canceled" ||
      event.type === "subscription_schedule.released"
    ) {
      if (subscription.scheduledUpdate?.scheduleId === schedule.id) {
        subscription.scheduledUpdate = undefined;
        subscription.markModified("scheduledUpdate");
        await subscription.save();
        logger.info(
          `Cleared scheduled update due to schedule ${event.type}: ${schedule.id}`
        );
      }
      return;
    }

    // If scheduled update is due (based on test clock or real time), clear and release it
    if (subscription.scheduledUpdate) {
      const effectiveTime = Math.floor(
        subscription.scheduledUpdate.effectiveDate.getTime() / 1000
      );

      if (effectiveTime <= now) {
        subscription.scheduledUpdate = undefined;
        subscription.markModified("scheduledUpdate");
        await subscription.save();
        logger.info(
          `Cleared scheduled update because effective date has passed: ${schedule.id}`
        );

        try {
          await this.stripeService.releaseSubscriptionSchedule(schedule.id);
          logger.info(`Released schedule after effective date: ${schedule.id}`);
        } catch (error) {
          logger.error(`Failed to release schedule ${schedule.id}:`, error);
        }

        return;
      }
    }

    // Handle upcoming scheduled upgrade/downgrade
    const upcomingPhase = schedule.phases?.find(
      (phase) => phase.start_date && phase.start_date > now
    );

    if (!upcomingPhase) {
      logger.warn("No upcoming phase found in subscription schedule");
      if (subscription.scheduledUpdate?.scheduleId === schedule.id) {
        subscription.scheduledUpdate = undefined;
        subscription.markModified("scheduledUpdate");
        await subscription.save();
        logger.info(
          `Cleared scheduled update with no upcoming phases: ${schedule.id}`
        );
      }
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
        interval: (price.recurring?.interval as "month" | "year") || "month",
        allowedUsers: parseInt(product.metadata.allowedUsers || "0", 10),
        allowedTranscripts: parseInt(
          product.metadata.allowedTranscripts || "0",
          10
        ),
        allowedReviews: parseInt(product.metadata.allowedReviews || "0", 10),
        tier: parseInt(product.metadata.tier || "0", 10),
        scheduleId: schedule.id,
      };

      await subscription.save();
      logger.info(`Scheduled update saved for subscription ${subscriptionId}`);
    } catch (error: any) {
      logger.error(`Failed to process schedule change: ${error.message}`, {
        subscriptionId,
        scheduleId: schedule.id,
        stack: error.stack,
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
      logger.error(`Error handling price event: ${error.message}`, {
        stack: error.stack,
      });
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
      logger.error(`Error handling product event: ${error.message}`, {
        stack: error.stack,
      });
      throw error;
    }
  }
}
