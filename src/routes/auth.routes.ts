import { Router, RequestHandler } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { RequestResetPasswordDto } from "../dto/auth/auth.request.password.reset.dto";
import { ResetPasswordDto } from "../dto/auth/auth.reset.password.dto";

const router = Router();

router.post("/login", authController.login as RequestHandler);
router.post(
  "/logout",
  authenticate as RequestHandler,
  authController.logout as RequestHandler
);
router.get(
  "/",
  authenticate as RequestHandler,
  authController.getProfile as RequestHandler
);
router.post("/refresh", authController.refreshToken as RequestHandler);
router.post(
  "/password-reset-request",
  validateDto(RequestResetPasswordDto),
  authController.requestReset
);

router.post(
  "/password-reset",
  validateDto(ResetPasswordDto),
  authController.resetPassword
);

export default router;
