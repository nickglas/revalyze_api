import { RequestHandler, Router } from "express";
import { authenticate, authorizeRole } from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { CreateCriterionDto } from "../dto/criterion/criterion.create.dto";
import {
  createCriterion,
  getCriteria,
  getCriterionById,
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
  authorizeRole(["company_admin"]),
  validateDto(CreateCriterionDto),
  createCriterion
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRole(["company_admin"]),
  updateStatus
);

export default router;
