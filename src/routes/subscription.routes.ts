import { Router, RequestHandler } from "express";
import * as subscriptionController from "../controllers/subscription.controller";

const router = Router();

router.get("/", subscriptionController.getPlans as RequestHandler);
// router.get('/', authenticate as RequestHandler, companyController.getCompany as RequestHandler);

export default router;
