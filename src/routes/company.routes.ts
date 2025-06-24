import { Router, RequestHandler } from "express";
import * as companyController from "../controllers/company.controller";
import { authenticate, authorizeRole } from "../middlewares/auth.middleware";
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
  authorizeRole(["company_admin"]),
  companyController.updateSubscription as RequestHandler
);

router.delete(
  "/subscriptions/cancel-active-subscription",
  authenticate as RequestHandler,
  authorizeRole(["company_admin"]),
  companyController.cancelSubscriptions as RequestHandler
);

router.delete(
  "/subscriptions/scheduled",
  authenticate as RequestHandler,
  authorizeRole(["company_admin"]),
  companyController.cancelScheduledSubscription as RequestHandler
);

router.patch(
  "/",
  authenticate as RequestHandler,
  authorizeRole(["company_admin"]),
  companyController.updateCompany as RequestHandler
);

export default router;
