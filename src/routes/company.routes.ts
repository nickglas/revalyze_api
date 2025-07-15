import { Router, RequestHandler } from "express";
import * as companyController from "../controllers/company.controller";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { RegisterCompanyDto } from "../dto/company/register.company.dto";

const router = Router();

router.post("/", validateDto(RegisterCompanyDto), companyController.register);

router.get(
  "/",
  authenticate as RequestHandler,
  companyController.getCompany as RequestHandler
);

router.patch(
  "/subscriptions",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  companyController.updateSubscription as RequestHandler
);

router.delete(
  "/subscriptions/cancel-active-subscription",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  companyController.cancelSubscriptions as RequestHandler
);

router.delete(
  "/subscriptions/scheduled",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  companyController.cancelScheduledSubscription as RequestHandler
);

router.patch(
  "/",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  companyController.updateCompany as RequestHandler
);

export default router;
