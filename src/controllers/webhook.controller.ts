import { Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeService } from '../services/stripe.service';
import { StripeWebhookService } from '../services/webhook.service';
import { Container } from 'typedi';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const stripeService = Container.get(StripeService);
  const stripeWebhookService = Container.get(StripeWebhookService);

  const rawBody = req.body;
  const signature = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    event = stripeService.constructEvent(
      rawBody,
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await stripeWebhookService.processStripeEvent(event);
    console.log(`Processed event: ${event.type}`)
    res.status(200).send('Event processed');
  } catch (err) {
    console.error('Webhook event handling failed:', err);
    res.status(500).send('Internal Server Error');
  }
};
