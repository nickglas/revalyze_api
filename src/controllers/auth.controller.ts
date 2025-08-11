// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import Container from "typedi";
import { MailService } from "../services/mail.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const authService = Container.get(AuthService);
    const tokens = await authService.authenticateUser(email, password);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const logoutAllDevicesFlag =
      req.body.logoutAllDevices === true ||
      req.body.logoutAllDevices === "true";

    if (logoutAllDevicesFlag) {
      const authService = Container.get(AuthService);

      await authService.logoutAllDevices(userId);
      return res.status(200).json({ message: "Logged out from all devices" });
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response) => {
  res.json(req.user);
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }
    const authService = Container.get(AuthService);
    const tokens = await authService.handleRefreshToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const requestReset = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const authService = Container.get(AuthService);
    const result = await authService.requestResetTokenForUser(email);

    if (result.success) {
      const mailService = Container.get(MailService);
      await mailService.sendResetPasswordEmail(email, result.message!);
    }

    res
      .status(200)
      .json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;
    const authService = Container.get(AuthService);
    await authService.resetPassword(token, password);

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    next(error);
  }
};

export const validateActivationToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;
    const authService = Container.get(AuthService);
    const isValid = await authService.validateActivationToken(token);
    res.status(200).json({ valid: isValid });
  } catch (error) {
    next(error);
  }
};

export const activateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;
    const authService = Container.get(AuthService);
    await authService.activateAccount(token, password);

    res
      .status(200)
      .json({ message: "Account has been activated successfully." });
  } catch (error) {
    next(error);
  }
};
