// src/entities/user.entity.ts
import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { IUserData, IUserMetrics, UserRole } from "../types/user.type";

export interface IUserDocument extends IUserData, Document {
  companyId: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserMetricsSchema = new Schema<IUserMetrics>(
  {
    lastCalculated: Date,
    reviewCount: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 },
    lastPeriodScores: [
      {
        period: String,
        overall: Number,
        sentiment: Number,
      },
    ],
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ["employee", "company_admin", "super_admin"],
      required: true,
    },
    metrics: UserMetricsSchema,
  },
  { timestamps: true }
);

// Password comparison method
userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(candidate, this.password);
};

export const UserModel = model<IUserDocument>("User", userSchema);
