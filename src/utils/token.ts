import jwt from "jsonwebtoken";

import { IUserDocument } from "../models/entities/user.entity";
import {
  CompanyModel,
  ICompanyDocument,
} from "../models/entities/company.entity";
import { ISubscriptionDocument } from "../models/entities/subscription.entity";

export const generateTokens = async (
  user: IUserDocument,
  company: ICompanyDocument,
  subscription: ISubscriptionDocument
) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      companyId: user.companyId.toString(),
      userIsActive: user.isActive,
      companyIsActive: company.isActive,
      companySubscription: subscription,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "5m" }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};
