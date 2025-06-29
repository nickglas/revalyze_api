import { Request, Response } from "express";
import Stripe from "stripe";
import { StripeService } from "../services/stripe.service";
import { StripeWebhookService } from "../services/webhook.service";
import { Container } from "typedi";
import { logger } from "../utils/logger";

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const stripeService = Container.get(StripeService);
  const stripeWebhookService = Container.get(StripeWebhookService);

  const rawBody = req.body;
  const signature = req.headers["stripe-signature"];
  const eventId = req.headers["stripe-event-id"] || "unknown";

  try {
    const event = stripeService.constructEvent(
      rawBody,
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await stripeWebhookService.processStripeEvent(event);

    logger.info(`Processed event: ${event.type}`, { eventId });
    return res.status(200).json({ received: true });
  } catch (err: any) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      logger.error(`Webhook signature verification failed: ${err.message}`, {
        eventId,
      });
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    logger.error(`Failed to process event: ${err.message}`, {
      eventId,
      error: err,
    });
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
