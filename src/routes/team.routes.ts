// src/routes/team.routes.ts
import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import {
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  toggleTeamStatus,
  updateTeam,
} from "../controllers/team.controller";
import { CreateTeamDto } from "../dto/team/team.create.dto";

const router = Router();

router.get("/", authenticate as RequestHandler, getTeams as RequestHandler);

router.get(
  "/:id",
  authenticate as RequestHandler,
  getTeamById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(CreateTeamDto),
  createTeam
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  updateTeam
);

router.patch(
  "/:id/toggle-status",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  toggleTeamStatus
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  deleteTeam
);

export default router;
