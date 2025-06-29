import { RequestHandler, Router } from "express";
import { authenticate, authorizeRole } from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import {
  createReviewConfig,
  getReviewConfigById,
  getReviewConfigs,
} from "../controllers/review.config.controller";
import { CreateReviewConfigDto } from "../dto/review.config/review.config.create.dto";

const router = Router();

router.get(
  "/",
  authenticate as RequestHandler,
  getReviewConfigs as RequestHandler
);
router.get(
  "/:id",
  authenticate as RequestHandler,
  getReviewConfigById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole(["company_admin", "super_admin"]),
  validateDto(CreateReviewConfigDto),
  createReviewConfig
);

export default router;
