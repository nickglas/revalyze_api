import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { CreateExternalCompanyDto } from "../dto/external.company/external.company.create.dto";
import {
  createExternalCompany,
  deleteExternalCompany,
  getExternalCompanies,
  getExternalCompanyById,
  toggleIsActive,
  updateExternalCompany,
} from "../controllers/external.company.controller";

const router = Router();

router.get(
  "/",
  authenticate as RequestHandler,
  getExternalCompanies as RequestHandler
);

router.get(
  "/:id",
  authenticate as RequestHandler,
  getExternalCompanyById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(CreateExternalCompanyDto),
  createExternalCompany
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  updateExternalCompany
);

router.patch(
  "/:id/toggle-status",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  toggleIsActive
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  deleteExternalCompany
);

export default router;
