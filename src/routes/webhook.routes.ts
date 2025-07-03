import { Router, RequestHandler, Request, Response } from "express";
import * as webhookController from "../controllers/webhook.controller";

const router = Router();

// Stripe sends POST requests with event data to this endpoint
router.post(
  "/",
  webhookController.handleStripeWebhook as unknown as RequestHandler
);

export default router;
