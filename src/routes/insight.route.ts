import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";

import {
  getCriteriaSummary,
  getCriteriaTrends,
  getDashboardMetrics,
  getEmployeeDetails,
  getEmployeeSummary,
  getSentimentDistribution,
  getSentimentTrends,
  getTeamsPerformanceSentimentData,
  getTrends,
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

router.get(
  "/trends",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getTrends as RequestHandler
);

router.get(
  "/criteria-trends",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getCriteriaTrends as RequestHandler
);

router.get(
  "/criteria-summary",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getCriteriaSummary as RequestHandler
);

router.get(
  "/dashboard-metrics",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getDashboardMetrics as RequestHandler
);

router.get(
  "/teams-dashboard-metrics",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getTeamsPerformanceSentimentData as RequestHandler
);

router.get(
  "/sentiment/distribution",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getSentimentDistribution as RequestHandler
);

router.get(
  "/sentiment/trends",
  authenticate as RequestHandler,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  getSentimentTrends as RequestHandler
);

export default router;
