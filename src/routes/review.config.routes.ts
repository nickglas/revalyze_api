import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import {
  createReviewConfig,
  deleteReviewConfig,
  getReviewConfigById,
  getReviewConfigs,
  toggleReviewConfigActivationStatus,
  updateReviewConfig,
} from "../controllers/review.config.controller";
import { CreateReviewConfigDto } from "../dto/review.config/review.config.create.dto";
import { UpdateReviewConfigDto } from "../dto/review.config/review.config.update.dto";

const router = Router();

router.get("/", authenticate, getReviewConfigs);
router.get("/:id", authenticate, getReviewConfigById);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(CreateReviewConfigDto),
  createReviewConfig
);

router.put(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(UpdateReviewConfigDto),
  updateReviewConfig
);
router.patch(
  "/:id/toggleActivation",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  toggleReviewConfigActivationStatus
);
router.delete(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  deleteReviewConfig
);

export default router;
