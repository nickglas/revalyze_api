// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import { generateTokens } from '../utils/token';
import bcrypt from 'bcryptjs';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const tokens = generateTokens(user);
  res.json(tokens);
};

export const logout = async (_req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getProfile = async (req: Request, res: Response) => {
  res.json(req.user);
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  // logic to verify refresh token and issue new access token
};

export const requestReset = async (req: Request, res: Response, next: NextFunction) => {
  // send email with reset token (use nodemailer/sendgrid)
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  // validate reset token, update password
};
