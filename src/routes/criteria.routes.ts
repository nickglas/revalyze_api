import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { CreateCriterionDto } from "../dto/criterion/criterion.create.dto";
import {
  createCriterion,
  getCriteria,
  getCriterionById,
  updateCriterion,
  updateStatus,
} from "../controllers/criteria.controller";

const router = Router();

router.get("/", authenticate as RequestHandler, getCriteria as RequestHandler);
router.get(
  "/:id",
  authenticate as RequestHandler,
  getCriterionById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(CreateCriterionDto),
  createCriterion
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  updateStatus
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  updateCriterion
);

export default router;
