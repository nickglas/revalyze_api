// src/sync/stripe-sync.service.ts
import { StripeService } from "../services/stripe.service";
import ProductModel from "../models/plan.model";
import { Service } from "typedi";
import { PlanRepository } from "../repositories/plan.repository";
import { PlanInput } from "../dto/plans/plan.input.dto";
import Stripe from "stripe";
import { logger } from "../utils/logger";

@Service()
export class StripeSyncService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly planRepo: PlanRepository
  ) {}

  async syncProducts() {
    logger.info("🔁 Fetching products from Stripe...");

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

      logger.info(`📦 Synced: ${product.name} (${product.id})`);
    }
  }
}
