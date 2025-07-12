// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    if (
      typeof decoded === "object" &&
      "id" in decoded &&
      "name" in decoded &&
      "email" in decoded &&
      "role" in decoded &&
      "companyId" in decoded &&
      "userIsActive" in decoded &&
      "companyIsActive" in decoded
    ) {
      if (!decoded.userIsActive || !decoded.companyIsActive) {
        res.status(403).json({ message: "User or company is deactivated" });
        return;
      }
      req.user = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId,
      };
      next();
    } else {
      res.status(401).json({ message: "Invalid token payload" });
    }
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  COMPANY_ADMIN = "company_admin",
  EMPLOYEE = "employee",
}

export const authorizeRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ message: "Forbidden: insufficient permissions" });
      return;
    }

    next();
  };
};
