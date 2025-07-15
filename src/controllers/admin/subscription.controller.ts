// routes/admin/subscription.routes.ts
import { Request, Response, NextFunction, Router } from "express";
import { StripeService } from "../../services/stripe.service";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../../utils/errors";
import Container from "typedi";
import { PlanService } from "../../services/plan.service";

// Admin-only: Create plan
export const createSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user || user.role !== "super_admin") {
      throw new UnauthorizedError(
        "Only super admins can create subscription plans."
      );
    }

    const { name, currency, metadata, prices: productPrices } = req.body;

    const errors: string[] = [];

    if (!name || typeof name !== "string")
      errors.push("Invalid or missing name");
    if (!currency || typeof currency !== "string")
      errors.push("Invalid or missing currency");
    if (metadata && typeof metadata !== "object")
      errors.push("Metadata must be an object");
    if (!Array.isArray(productPrices) || productPrices.length === 0)
      errors.push("Prices must be a non-empty array");

    productPrices.forEach((p: any, i: number) => {
      if (!["month", "year"].includes(p.interval))
        errors.push(`Price at index ${i} has invalid interval`);
      if (typeof p.amount !== "number" || p.amount <= 0)
        errors.push(`Price at index ${i} must have a positive amount`);
    });

    if (errors.length > 0) {
      throw new BadRequestError(`Invalid request: ${errors.join(", ")}`);
    }

    const stripeService = Container.get(StripeService);

    // Just call Stripe — the webhook will sync DB afterward
    const { product, prices } = await stripeService.createSubscriptionPlan(
      name,
      currency,
      productPrices,
      metadata
    );

    res.status(201).json({ stripe: { product, prices } });
  } catch (error) {
    next(error);
  }
};

// Admin-only: Update plan
// router.put('/admin/subscriptions/:productId', async (req, res) => {
//   const { productId } = req.params;
//   const result = await stripeAdminService.updateSubscriptionPlan(productId, req.body);
//   res.json(result);
// });

// // Public: Get available plans
// router.get('/subscriptions', async (_req, res) => {
//   const plans = await stripeAdminService.listActivePlans();
//   res.json(plans);
// });
