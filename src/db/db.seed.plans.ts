import dotenv from "dotenv";
import Container from "typedi";
import { StripeService } from "../services/stripe.service";
import { logger } from "../utils/logger";

dotenv.config();

const stripeService = Container.get(StripeService);

export type SeededPlan = {
  name: string;
  tier: number;
  productId: string;
  prices: { interval: "month" | "year"; amount: number; priceId: string }[];
};

export const seedProducts = async (): Promise<SeededPlan[]> => {
  const seedData = [
    {
      name: "Business Plan",
      currency: "eur",
      metadata: {
        tier: 3,
        allowedUsers: 999999,
        allowedTranscripts: 10000,
      },
      features: ["Priority Support", "Analytics Dashboard"],
      prices: [
        { interval: "month" as const, amount: 150000 },
        { interval: "year" as const, amount: 1500000 },
      ],
    },
    {
      name: "Pro Plan",
      currency: "eur",
      metadata: {
        tier: 2,
        allowedUsers: 10,
        allowedTranscripts: 1000,
      },
      features: ["Priority Support", "Analytics Dashboard"],
      prices: [
        { interval: "month" as const, amount: 14900 },
        { interval: "year" as const, amount: 149000 },
      ],
    },
    {
      name: "Starter Plan",
      currency: "eur",
      metadata: {
        tier: 1,
        allowedUsers: 3,
        allowedTranscripts: 250,
      },
      features: ["Priority Support", "Analytics Dashboard"],
      prices: [
        { interval: "month" as const, amount: 4900 },
        { interval: "year" as const, amount: 49000 },
      ],
    },
  ];

  for (const plan of seedData) {
    try {
      const exists = await stripeService.productExistsByName(plan.name);

      if (exists) {
        logger.info(`Skipping "${plan.name}" — already exists in Stripe.`);
        continue;
      }

      const { product, prices } = await stripeService.createSubscriptionPlan(
        plan.name,
        plan.currency,
        plan.prices,
        plan.metadata,
        plan.features
      );

      logger.info(
        `Created "${product.name}" with prices:`,
        prices.map((p) => p.id)
      );
    } catch (error) {
      logger.error(`Failed to seed "${plan.name}":`, error);
    }
  }

  const allPrices = await stripeService.getAvailableSubscriptions();

  const result = seedData.map((plan) => {
    const stripePrices = allPrices.filter((p) => p.productName === plan.name);

    return {
      name: plan.name,
      tier: plan.metadata.tier as number,
      productId: stripePrices[0]?.productId ?? "unknown",
      prices: stripePrices.map((p) => ({
        interval: p.interval as "month" | "year",
        amount: p.amount!,
        priceId: p.priceId,
      })),
    };
  });

  return result;
};
