import jwt from "jsonwebtoken";

import { IUserDocument } from "../models/entities/user.entity";
import { CompanyModel } from "../models/entities/company.entity";

export const generateTokens = async (user: IUserDocument) => {
  const company = await CompanyModel.findById(user.companyId).select(
    "isActive"
  );

  const accessToken = jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      companyId: user.companyId.toString(),
      userIsActive: user.isActive,
      companyIsActive: company?.isActive ?? true,
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
