// src/types/refresh.token.type.ts
import mongoose from "mongoose";

export interface IRefreshTokenData {
  userId: mongoose.Types.ObjectId;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}
