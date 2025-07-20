import { RequestHandler, Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";

import {
  getEmployeeDetails,
  getEmployeeSummary,
} from "../controllers/insight.controller";

const router = Router();

router.get(
  "/employee/summary",
  authenticate as RequestHandler,
  getEmployeeSummary as RequestHandler
);

router.get(
  "/employee/details",
  authenticate as RequestHandler,
  getEmployeeDetails as RequestHandler
);

export default router;
