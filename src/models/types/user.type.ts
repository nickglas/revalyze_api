// src/types/user.type.ts
import mongoose from "mongoose";

export type UserRole = "employee" | "company_admin" | "super_admin";

export interface IUserData {
  email: string;
  name: string;
  password: string;
  companyId: string | mongoose.Types.ObjectId;
  isActive: boolean;
  role: UserRole;
}
