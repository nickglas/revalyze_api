// src/sync/stripe-sync.service.ts
import { StripeService } from "./stripe.service";
import { Service } from "typedi";
import { PlanRepository } from "../repositories/plan.repository";
import { PlanInput } from "../dto/plans/plan.input.dto";
import Stripe from "stripe";
import { logger } from "../utils/logger";
import { PendingCompanyRepository } from "../repositories/pending.repository";
import { CompanyService } from "./company.service";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import Subscription, { ISubscription } from "../models/subscription.model";
import { CompanyRepository } from "../repositories/company.repository";
import { ICompany } from "../models/company.model";
import { createWriteStream } from "fs";

@Service()
export class StripeSyncService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly planRepo: PlanRepository,
    private readonly pendingCompanyRepo: PendingCompanyRepository,
    private readonly companyService: CompanyService,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly companyRepository: CompanyRepository
  ) {}

  async syncPendingSubscriptions() {
    logger.info("Syncing pending subscriptions from Stripe...");

    const pendingCompanies = await this.pendingCompanyRepo.find();

    for (const pending of pendingCompanies) {
      try {
        // Get the session
        const session = await this.stripeService.getCheckoutSession(
          pending.stripeSessionId
        );

        // Check if expired
        if (session.status === "expired") {
          logger.info(
            `Deleting expired session for pending company ${pending.id}`
          );
          await this.pendingCompanyRepo.delete(pending.id);
        }

        // Check if paid
        if (session.payment_status === "paid") {
          // Verify subscription
          const subscription = await this.stripeService.getSubscription(
            session.subscription as string
          );

          // Activate if subscription is active
          if (subscription.status === "active") {
            await this.companyService.activateCompany(
              pending.id,
              session.subscription as string
            );
            // Remove pending
            await this.pendingCompanyRepo.delete(pending.id);
          }
        }
      } catch (error) {
        logger.error(`Sync failed for pending company ${pending._id}:`, error);
      }
    }
  }

  async syncProducts() {
    logger.info("Syncing products from Stripe...");

    const products = await this.stripeService.getProducts();

    for (const product of products) {
      const prices = await this.stripeService.getPricesForProduct(product.id);

      const billingOptions = prices
        .filter(
          (
            price
          ): price is Stripe.Price & {
            recurring: {
              interval: "day" | "week" | "month" | "year" | "one_time";
            };
            unit_amount: number;
          } => !!price.recurring?.interval && price.unit_amount !== null
        )
        .map((price) => ({
          interval: price.recurring.interval,
          stripePriceId: price.id,
          amount: price.unit_amount,
        }));

      const metadata = product.metadata || {};

      const doc: PlanInput = {
        name: product.name,
        stripeProductId: product.id,
        currency: prices[0]?.currency ?? "eur",
        billingOptions,
        allowedUsers: parseInt(metadata.allowedUsers || "0"),
        allowedTranscripts: parseInt(metadata.allowedTranscripts || "0"),
        isActive: product.active && !product.deleted,
      };

      await this.planRepo.upsert(doc);
      logger.info(`Synced product: ${product.name} (${product.id})`);
    }
  }

  async syncCompanies() {
    logger.info("Syncing companies from Stripe...");

    const localCompanies = await this.companyRepository.findAll();
    const stripeCompanies = await this.stripeService.getCustomers();

    logger.info(stripeCompanies);
    if (!stripeCompanies) {
      return logger.info("No company data found to sync...");
    }

    logger.info(`Found ${stripeCompanies.length} companies to sync`);

    // Loop over all Stripe customers and sync them
    await Promise.all(
      stripeCompanies.map(async (sc) => {
        //get the localCompany
        const existingCompany = localCompanies.find(
          (lc) => lc.stripeCustomerId === sc.id
        );

        //if not found (create a new company but dont activate it since no user can be created yet)
        //otherwise find the company and forcefully update its data.
        if (!existingCompany) {
          await this.createCompany(sc);
        } else {
          await this.updateCompany(existingCompany, sc);
        }

        logger.info(`Synced company: ${sc.name} (${sc.id})`);
      })
    );
  }

  private async createCompany(stripeCompany: Stripe.Customer) {
    if (!stripeCompany.name || !stripeCompany.email) {
      logger.warn(
        `Cannot create company: missing name or email for Stripe customer ${stripeCompany.id}`
      );
      return;
    }

    const newCompany: Partial<ICompany> = {
      name: stripeCompany.name,
      mainEmail: stripeCompany.email,
      stripeCustomerId: stripeCompany.id,
      isActive: false, // Don't activate yet (no user exists)
    };

    if (stripeCompany.phone) {
      newCompany.phone = stripeCompany.phone;
    }

    if (stripeCompany.address?.city) {
      newCompany.address = stripeCompany.address.city;
    }

    await this.companyRepository.create(newCompany);

    logger.info(
      `Created new company from Stripe: ${stripeCompany.name} (${stripeCompany.id})`
    );
  }

  private async updateCompany(
    localCompany: ICompany,
    stripeCompany: Stripe.Customer
  ) {
    if (!stripeCompany.name || !stripeCompany.email) {
      logger.warn(
        `Missing required fields in Stripe customer ${stripeCompany.id}: name or email`
      );
      return;
    }

    localCompany.name = stripeCompany.name;
    localCompany.mainEmail = stripeCompany.email;
    localCompany.stripeCustomerId = stripeCompany.id;

    // Optional fields
    if (stripeCompany.phone !== null && stripeCompany.phone !== undefined) {
      localCompany.phone = stripeCompany.phone;
    }

    if (stripeCompany.address?.city) {
      localCompany.address = stripeCompany.address.city;
    }

    await this.companyRepository.update(localCompany.id, localCompany);
  }

  async syncSubscriptions() {
    logger.info("Syncing subscriptions from Stripe...");

    // Get current active subscriptions from your DB
    const activeSubscriptions = await this.subscriptionRepo.find();
    let stripeSubscriptions: Stripe.Subscription[] = [];

    // Check environment
    const isDevelopment = process.env.NODE_ENV === "development";
    const testClockTimes: Record<string, number> = {};

    if (isDevelopment) {
      logger.info(
        "Development mode: syncing subscriptions from all test clocks"
      );

      // Fetch all test clocks
      const testClocks = await this.stripeService.getAllTestClocks();
      for (const clock of testClocks) {
        // Store frozen time for each test clock
        if (clock.frozen_time) {
          testClockTimes[clock.id] = clock.frozen_time;
        }

        const subs = await this.stripeService.getAllSubscriptions(clock.id);
        stripeSubscriptions.push(...subs);
      }

      // Fetch subscriptions without clocks
      const subsWithoutClock = await this.stripeService.getAllSubscriptions();
      stripeSubscriptions.push(...subsWithoutClock);
    } else {
      logger.info("Production mode: syncing subscriptions without test clocks");
      const subs = await this.stripeService.getAllSubscriptions();
      stripeSubscriptions.push(...subs);
    }

    if (!stripeSubscriptions.length) {
      return logger.info("No subscription data found to sync...");
    }

    logger.info(`Found ${stripeSubscriptions.length} subscriptions to sync`);

    // Loop over all Stripe subscriptions and sync them
    await Promise.all(
      stripeSubscriptions.map(async (s) => {
        const existing = activeSubscriptions.find(
          (as) => as.stripeSubscriptionId === s.id
        );

        if (!existing) {
          return await this.createSubscription(s);
        }

        const updatedSubscription = await this.updateSubscription(existing, s);

        if (updatedSubscription) {
          // Sync scheduled updates for existing subscriptions
          if (s.schedule) {
            await this.syncSubscriptionSchedule(
              s.schedule as Stripe.SubscriptionSchedule,
              updatedSubscription,
              s, // Pass the original Stripe subscription
              testClockTimes
            );
          } else {
            // Clear scheduled update if schedule was removed
            if (updatedSubscription.scheduledUpdate) {
              updatedSubscription.scheduledUpdate = undefined;
              await this.subscriptionRepo.update(
                updatedSubscription.id,
                updatedSubscription
              );
            }
          }
        }
      })
    );
  }

  private async syncSubscriptionSchedule(
    localSchedule: Stripe.SubscriptionSchedule,
    subscription: ISubscription,
    stripeSubscription: Stripe.Subscription,
    testClockTimes: Record<string, number>
  ): Promise<void> {
    try {
      const schedule = await this.stripeService.getSubscriptionScheduleById(
        localSchedule.id
      );

      const now = this.getCurrentTime(testClockTimes, stripeSubscription);

      if (["canceled", "released", "completed"].includes(schedule.status)) {
        if (subscription.scheduledUpdate?.scheduleId === schedule.id) {
          delete subscription.scheduledUpdate;
          subscription.markModified("scheduledUpdate");
          await subscription.save();
          logger.info(
            `Cleared scheduled update for ${schedule.status} schedule: ${schedule.id}`
          );
        }
        return;
      }

      if (subscription.scheduledUpdate) {
        const effectiveTime = Math.floor(
          subscription.scheduledUpdate.effectiveDate.getTime() / 1000
        );

        if (effectiveTime <= now) {
          delete subscription.scheduledUpdate;
          subscription.markModified("scheduledUpdate");
          await subscription.save();
          logger.info(
            `Cleared scheduled update because effective date has passed: ${schedule.id}`
          );

          try {
            await this.stripeService.releaseSubscriptionSchedule(schedule.id);
            logger.info(
              `Released schedule after effective date: ${schedule.id}`
            );
          } catch (error) {
            logger.error(`Failed to release schedule ${schedule.id}:`, error);
          }
          return;
        }
      }

      const upcomingPhase = schedule.phases?.find(
        (phase) => phase.start_date && phase.start_date > now
      );

      if (!upcomingPhase) {
        if (subscription.scheduledUpdate?.scheduleId === schedule.id) {
          delete subscription.scheduledUpdate;
          subscription.markModified("scheduledUpdate");
          await subscription.save();
          logger.info(
            `Cleared scheduled update with no upcoming phases: ${schedule.id}`
          );
        }
        return;
      }

      const priceId = upcomingPhase.items[0].price as string;
      const price = await this.stripeService.getPriceById(priceId);
      const product = await this.stripeService.getProductById(
        price.product as string
      );

      subscription.scheduledUpdate = {
        effectiveDate: new Date(upcomingPhase.start_date! * 1000),
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
        tier: parseInt(product.metadata.tier || "0", 10),
        scheduleId: schedule.id,
      };
      await subscription.save();
    } catch (error) {
      logger.error(`Error syncing schedule ${localSchedule.id}:`, error);
    }
  }

  private getCurrentTime(
    testClockTimes: Record<string, number>,
    subscription: Stripe.Subscription
  ): number {
    // Use test clock time if available
    if (
      subscription.test_clock &&
      testClockTimes[subscription.test_clock as string]
    ) {
      return testClockTimes[subscription.test_clock as string];
    }

    // Fallback to real time
    return Math.floor(Date.now() / 1000);
  }

  private createSubscription = async (
    stripeSubscription: Stripe.Subscription
  ) => {
    const item = stripeSubscription.items.data[0];
    const price = item.price;
    const productId = price.product as string;
    const product = await this.stripeService.getProductById(productId);
    const company = await this.companyRepository.findByStripeCustomerId(
      stripeSubscription.customer as string
    );

    if (!company) {
      logger.warn(
        `Could not create new subscription with stripe id: ${stripeSubscription.id}. Company ${stripeSubscription.customer} was not found as registered company`
      );
      return;
    }

    const newSubscription = {
      companyId: company.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      productId: product.id,
      productName: product.name,
      priceId: price.id,
      amount: price.unit_amount ?? 0,
      currency: price.currency,
      interval: price.recurring?.interval ?? "month",
      status: stripeSubscription.status,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      currentPeriodStart: new Date(
        stripeSubscription.items.data[0].current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        stripeSubscription.items.data[0].current_period_end * 1000
      ),
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : undefined,
      allowedTranscripts: parseInt(
        product.metadata["allowedTranscripts"] ?? "0"
      ),
      allowedUsers: parseInt(product.metadata["allowedUsers"] ?? "0"),
      tier: parseInt(product.metadata["tier"] ?? "0"),
    };

    const newSub = await this.subscriptionRepo.create(newSubscription);

    if (!newSub) {
      logger.error(
        `Error saving new subscription from stripe with id ${stripeSubscription.id}`
      );
      return;
    }

    logger.info(`Saved new subscription with id ${stripeSubscription.id}`);
    return newSub;
  };

  private updateSubscription = async (
    activeSubscription: ISubscription,
    stripeSubscription: Stripe.Subscription
  ) => {
    const item = stripeSubscription.items.data[0];
    const price = item.price;
    const productId = price.product as string;
    const product = await this.stripeService.getProductById(productId);
    const company = await this.companyRepository.findByStripeCustomerId(
      stripeSubscription.customer as string
    );

    if (!company) {
      logger.error(
        `Cannot update subscription. Company not found for Stripe customer ${stripeSubscription.customer}`
      );
      return;
    }

    activeSubscription.companyId = company.id;
    activeSubscription.stripeSubscriptionId = stripeSubscription.id;
    activeSubscription.stripeCustomerId = stripeSubscription.customer as string;
    activeSubscription.productId = product.id;
    activeSubscription.productName = product.name;
    activeSubscription.priceId = price.id;
    activeSubscription.amount = price.unit_amount ?? 0;
    activeSubscription.currency = price.currency;
    activeSubscription.interval = price.recurring?.interval ?? "month";
    activeSubscription.status = stripeSubscription.status;
    activeSubscription.cancelAtPeriodEnd =
      stripeSubscription.cancel_at_period_end;
    activeSubscription.currentPeriodStart = new Date(
      item.current_period_start * 1000
    );
    activeSubscription.currentPeriodEnd = new Date(
      item.current_period_end * 1000
    );
    activeSubscription.canceledAt = stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : undefined;
    activeSubscription.allowedTranscripts = parseInt(
      product.metadata["allowedTranscripts"] ?? "0"
    );
    activeSubscription.allowedUsers = parseInt(
      product.metadata["allowedUsers"] ?? "0"
    );
    activeSubscription.tier = parseInt(product.metadata["tier"] ?? "0");

    const updated = await this.subscriptionRepo.update(
      activeSubscription.id,
      activeSubscription
    );

    await activeSubscription.save();

    if (!updated) {
      logger.error(
        `Error updating subscription from Stripe with id ${stripeSubscription.id}`
      );
    } else {
      logger.info(`Updated subscription with id ${stripeSubscription.id}`);
    }

    return updated;
  };
}
