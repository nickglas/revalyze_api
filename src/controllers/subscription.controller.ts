// routes/admin/subscription.routes.ts
import { Request, Response, NextFunction, Router } from "express";
import Container from "typedi";
import { PlanService } from "../services/plan.service";

const router = Router();

// Public: Get available plans
export const getSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const planService = Container.get(PlanService);
    const p = await planService.getAvailablePlans();
    res.json(p);
  } catch (error) {
    next(error);
  }
};

export default router;
