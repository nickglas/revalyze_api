// models/refreshToken.model.ts
import mongoose, { Document, Schema } from "mongoose";

// Interface representing a refresh token document
export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  ip: { type: String },
  userAgent: { type: String },
});

const RefreshToken = mongoose.model<IRefreshToken>(
  "RefreshToken",
  refreshTokenSchema
);

export default RefreshToken;
