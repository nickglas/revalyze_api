import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  getTeams,
} from "../controllers/user.controller";
import {
  authenticate,
  authorizeRole,
  UserRole,
} from "../middlewares/auth.middleware";
import { validateDto } from "../middlewares/validate.middleware";
import { CreateUserDto } from "../dto/user/user.create.dto";
import { UpdateUserDto } from "../dto/user/user.update.dto";
import { AdminUpdateUserDto } from "../dto/user/user.admin.update.dto";

const router = Router();

// All authenticated users can list users in their company (with optional filters)
router.get("/", authenticate, getUsers);

// Retrieve specific user (admin or self)
router.get("/:id", authenticate, getUserById);

// Retrieve specific user teams
router.get("/:id/teams", authenticate, getTeams);

// Only admins can create new users
router.post(
  "/",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  validateDto(CreateUserDto),
  createUser
);

// Updates for both admins and normal users
router.patch(
  "/:id",
  authenticate,
  (req, res, next) => {
    // Apply different DTO validation depending on user role and target
    if (
      req.user?.role === UserRole.COMPANY_ADMIN &&
      req.user?.id !== req.params.id
    ) {
      return validateDto(AdminUpdateUserDto)(req, res, next);
    } else {
      return validateDto(UpdateUserDto)(req, res, next);
    }
  },
  updateUser
);

// Admins can toggle user active status
router.patch(
  "/:id/toggle-status",
  authenticate,
  authorizeRole([UserRole.COMPANY_ADMIN]),
  toggleUserStatus
);

export default router;
