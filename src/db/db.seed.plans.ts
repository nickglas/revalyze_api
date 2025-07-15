import dotenv from "dotenv";
import Container from "typedi";
import { StripeService } from "../services/stripe.service";
import { logger } from "../utils/logger";

dotenv.config();

const stripeService = Container.get(StripeService);

export type SeededPlan = {
  name: string;
  productId: string;
  prices: {
    interval: "month" | "year";
    amount: number;
    priceId: string;
    tier: number;
  }[];
};

export const seedProducts = async (): Promise<SeededPlan[]> => {
  const seedData = [
    {
      name: "Business Plan",
      currency: "eur",
      metadata: {
        allowedUsers: 999999,
        allowedTranscripts: 20000,
        allowedReviews: 10000,
      },
      features: ["Priority Support", "Analytics Dashboard"],
      prices: [
        { interval: "month" as const, amount: 150000, tier: 30 },
        { interval: "year" as const, amount: 1500000, tier: 35 },
      ],
    },
    {
      name: "Pro Plan",
      currency: "eur",
      metadata: {
        allowedUsers: 10,
        allowedTranscripts: 2000,
        allowedReviews: 1000,
      },
      features: ["Priority Support", "Analytics Dashboard"],
      prices: [
        { interval: "month" as const, amount: 14900, tier: 20 },
        { interval: "year" as const, amount: 149000, tier: 25 },
      ],
    },
    {
      name: "Starter Plan",
      currency: "eur",
      metadata: {
        allowedUsers: 3,
        allowedTranscripts: 500,
        allowedReviews: 250,
      },
      features: ["Priority Support", "Analytics Dashboard"],
      prices: [
        { interval: "month" as const, amount: 4900, tier: 10 },
        { interval: "year" as const, amount: 49000, tier: 15 },
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

      logger.info(`Created "${product.name}"`);
    } catch (error) {
      logger.error(`Failed to seed "${plan.name}":`, error);
    }
  }

  const allPrices = await stripeService.getAvailableSubscriptions();

  const result = seedData.map((plan) => {
    const stripePrices = allPrices.filter((p) => p.productName === plan.name);

    return {
      name: plan.name,
      productId: stripePrices[0]?.productId ?? "unknown",
      prices: stripePrices.map((p) => ({
        interval: p.interval as "month" | "year",
        tier: Number(p.metadata.tier),
        amount: p.amount!,
        priceId: p.priceId,
      })),
    };
  });

  return result;
};
