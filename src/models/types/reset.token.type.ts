// src/types/reset.token.type.ts
import mongoose from "mongoose";

export interface IResetTokenData {
  userId: string | mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}
