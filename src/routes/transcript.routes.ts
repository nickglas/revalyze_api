import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { CreateTranscriptDto } from "../dto/transcript/transcript.create.dto";
import {
  createTranscript,
  deleteTranscript,
  getTranscriptById,
  getTranscripts,
} from "../controllers/transcript.controller";

const router = Router();

router.get(
  "/",
  authenticate as RequestHandler,
  getTranscripts as RequestHandler
);

router.get(
  "/:id",
  authenticate as RequestHandler,
  getTranscriptById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE]),
  validateDto(CreateTranscriptDto),
  createTranscript
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  deleteTranscript
);

export default router;
