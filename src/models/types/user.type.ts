// src/types/user.type.ts
import mongoose from "mongoose";

export type UserRole = "employee" | "company_admin" | "super_admin";

export interface IUserMetrics {
  lastCalculated?: Date;
  reviewCount: number;
  overallScore: number;
  sentimentScore: number;
  lastPeriodScores: Array<{
    period: string;
    overall: number;
    sentiment: number;
  }>;
}

export interface IUserData {
  email: string;
  name: string;
  password: string;
  companyId: string | mongoose.Types.ObjectId;
  isActive: boolean;
  role: UserRole;
  metrics?: IUserMetrics;
}
