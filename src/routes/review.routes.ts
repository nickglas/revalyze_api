import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import {
  createReview,
  getReviewById,
  getReviews,
  retryReview,
} from "../controllers/review.controller";
import { CreateReviewDto } from "../dto/review/review.create.dto";

const router = Router();

router.get("/", authenticate as RequestHandler, getReviews as RequestHandler);

router.get(
  "/:id",
  authenticate as RequestHandler,
  getReviewById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE]),
  validateDto(CreateReviewDto),
  createReview
);

router.post(
  "/:id/retry",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE]),
  retryReview
);

export default router;
