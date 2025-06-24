// seedProducts.ts
import dotenv from "dotenv";
import Container from "typedi";
import { StripeService } from "../services/stripe.service";

dotenv.config();

const stripeService = Container.get(StripeService);

export const seedProducts = async () => {
  const seedData: {
    name: string;
    currency: string;
    metadata: Record<string, string | number>;
    features?: string[];
    prices: { interval: "month" | "year"; amount: number }[];
  }[] = [
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
        { interval: "month", amount: 150000 },
        { interval: "year", amount: 1500000 },
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
        { interval: "month", amount: 14900 },
        { interval: "year", amount: 149000 },
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
        { interval: "month", amount: 4900 },
        { interval: "year", amount: 49000 },
      ],
    },
  ];

  for (const plan of seedData) {
    try {
      const exists = await stripeService.productExistsByName(plan.name);

      if (exists) {
        console.log(`⚠️ Skipping "${plan.name}" — already exists in Stripe.`);
        continue;
      }

      const { product, prices } = await stripeService.createSubscriptionPlan(
        plan.name,
        plan.currency,
        plan.prices,
        plan.metadata,
        plan.features
      );

      console.log(
        `✅ Created "${product.name}" with prices:`,
        prices.map((p) => p.id)
      );
    } catch (error) {
      console.error(`❌ Failed to seed "${plan.name}":`, error);
    }
  }
};
