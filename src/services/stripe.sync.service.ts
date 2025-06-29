// src/sync/stripe-sync.service.ts
import { StripeService } from "./stripe.service";
import ProductModel from "../models/plan.model";
import { Service } from "typedi";
import { PlanRepository } from "../repositories/plan.repository";
import { PlanInput } from "../dto/plans/plan.input.dto";
import Stripe from "stripe";
import { logger } from "../utils/logger";
import { PendingCompanyRepository } from "../repositories/pending.repository";
import { CompanyService } from "./company.service";

@Service()
export class StripeSyncService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly planRepo: PlanRepository,
    private readonly pendingCompanyRepo: PendingCompanyRepository,
    private readonly companyService: CompanyService
  ) {}

  async syncPendingSubscriptions() {
    logger.info("Syncing pending subscriptions from Stripe...");

    const pendingCompanies = await this.pendingCompanyRepo.find();

    for (const pending of pendingCompanies) {
      try {
        //get the session
        const session = await this.stripeService.getCheckoutSession(
          pending.stripeSessionId
        );

        //check if expired
        if (session.status === "expired") {
          logger.info(
            `Deleting expired session for pending company ${pending.id}`
          );

          await this.pendingCompanyRepo.delete(pending.id);
        }

        //check if paid
        if (session.payment_status === "paid") {
          //verify subscription
          const subscription = await this.stripeService.getSubscription(
            session.subscription as string
          );

          //activate if subscription is active
          if (subscription.status === "active") {
            await this.companyService.activateCompany(
              pending.id,
              session.subscription as string
            );

            //remove pending
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
}
