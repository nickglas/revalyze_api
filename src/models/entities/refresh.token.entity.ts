// src/entities/refreshToken.entity.ts
import mongoose, { Schema, model, Document, Types } from "mongoose";
import { IRefreshTokenData } from "../types/refresh.token.type";

export interface IRefreshTokenDocument extends IRefreshTokenData, Document {
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  }
);

export const RefreshTokenModel = model<IRefreshTokenDocument>(
  "RefreshToken",
  refreshTokenSchema
);
