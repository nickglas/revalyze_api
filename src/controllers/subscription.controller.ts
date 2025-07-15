// routes/admin/subscription.routes.ts
import { Request, Response, NextFunction, Router } from 'express';
import { StripeService } from '../services/stripe.service';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';

const router = Router();
const stripeService = new StripeService();

// Public: Get available plans
export const getSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await stripeService.getAvailableSubscriptions();
    res.json(plans);
  } catch (error) {
    next(error)
  }
}

export default router;
