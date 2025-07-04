// src/routes/contact.routes.ts
import { RequestHandler, Router } from "express";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { CreateContactDto } from "../dto/contact/contact.create.dto";
import { UpdateContactDto } from "../dto/contact/contact.update.dto";
import {
  createContact,
  deleteContact,
  getContactById,
  getContacts,
  toggleContactStatus,
  updateContact,
} from "../controllers/contact.controller";

const router = Router();

router.get("/", authenticate as RequestHandler, getContacts as RequestHandler);

router.get(
  "/:id",
  authenticate as RequestHandler,
  getContactById as RequestHandler
);

router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(CreateContactDto),
  createContact
);

router.patch(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(UpdateContactDto),
  updateContact
);

router.patch(
  "/:id/toggle-status",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  toggleContactStatus
);

router.delete(
  "/:id",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  deleteContact
);

export default router;
