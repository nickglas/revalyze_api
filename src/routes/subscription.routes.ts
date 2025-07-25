import { Router, RequestHandler } from "express";
import * as subscriptionController from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", subscriptionController.getSubscriptions as RequestHandler);
// router.get('/', authenticate as RequestHandler, companyController.getCompany as RequestHandler);

export default router;
