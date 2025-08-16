// routes/admin/subscription.routes.ts
import { Request, Response, NextFunction, Router } from "express";
import Container from "typedi";
import { PlanService } from "../services/plan.service";

const router = Router();

// Public: Get available plans
export const getPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const planService = Container.get(PlanService);
    const plans = await planService.getAvailablePlans();
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export default router;
