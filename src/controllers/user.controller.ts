// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Container } from "typedi";
import { UserService } from "../services/user.service";
import { CreateUserDto } from "../dto/user/user.create.dto";

/**
 * Controller to handle GET /users
 * Retrieves paginated users within the same company (optional filters: isActive, role).
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);

    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;

    const role = req.query.role as "employee" | "company_admin" | undefined;
    const name = req.query.name?.toString();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Sorting parameters
    const sortBy = req.query.sortBy?.toString() || "createdAt";
    const sortOrder = req.query.sortOrder?.toString() === "asc" ? 1 : -1;

    const userService = Container.get(UserService);
    const { users, total } = await userService.getUsersByCompany(
      companyId,
      isActive,
      role,
      name,
      page,
      limit,
      sortBy,
      sortOrder
    );

    res.status(200).json({
      data: users,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle GET /users/:id
 * Retrieves a specific user by ID, scoped to the same company or self.
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const userId = req.params.id;

    const userService = Container.get(UserService);
    const user = await userService.findByIdWithinCompany(userId, companyId);

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle POST /users
 * Creates a new user in the company.
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const dto: CreateUserDto = req.body;
    const userService = Container.get(UserService);
    const user = await userService.createUser(companyId, dto);

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle PATCH /users/:id
 * Updates user information (name, email) for the given user ID within the same company.
 * - Admins can update any user, including their role.
 * - Users can only update themselves and cannot update role or companyId.
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const targetUserId = req.params.id;
    const updates = req.body;

    const userService = Container.get(UserService);
    const updatedUser = await userService.updateUserWithAccessControl(
      req.user!.id,
      req.user!.role,
      targetUserId,
      companyId,
      updates
    );

    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle PATCH /users/:id/toggle-status
 * Deactivates or activates a user based on `isActive` field in body.
 */
export const toggleUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const userId = req.params.id;

    const userService = Container.get(UserService);
    const updatedUser = await userService.toggleActivationStatus(
      userId,
      companyId
    );

    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};
