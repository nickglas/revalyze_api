import jwt from "jsonwebtoken";
import { IUser } from "../models/.old/x.user.model";
import Company from "../models/.old/x.company.model";
import { IUserDocument } from "../models/entities/user.entity";

export const generateTokens = async (user: IUserDocument) => {
  const company = await Company.findById(user.companyId).select("isActive");

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
