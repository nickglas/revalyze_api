// src/entities/reset-token.entity.ts
import mongoose, { Schema, model, Document } from "mongoose";
import { IResetTokenData } from "../types/reset.token.type";

export interface IResetTokenDocument extends IResetTokenData, Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

const resetTokenSchema = new Schema<IResetTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const ResetTokenModel = model<IResetTokenDocument>(
  "ResetToken",
  resetTokenSchema
);
