// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import Container from "typedi";

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
    res.status(401).json({ message: "Invalid credentials" });
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
  // send email with reset token (use nodemailer/sendgrid)
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // validate reset token, update password
};
