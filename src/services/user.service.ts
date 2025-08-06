// src/services/user.service.ts
import { Service } from "typedi";
import mongoose, { Mongoose, Types } from "mongoose";
import { UserRepository } from "../repositories/user.repository";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { IUserDocument } from "../models/entities/user.entity";

@Service()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository
  ) {}

  /**
   * Finds a user by email.
   *
   * @param email - Email address to search.
   * @throws BadRequestError when email is missing
   * @throws NotFoundError when User not found
   * @returns The found user or throws NotFoundError.
   */
  async findByEmail(email: string): Promise<IUserDocument> {
    if (!email) throw new BadRequestError("Email is required");

    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundError("User not found");

    return user;
  }

  /**
   * Finds a user by ID.
   *
   * @param userId - ID of the user.
   * @throws BadRequestError when User ID is missing
   * @throws NotFoundError when User not found
   * @returns The found user or throws NotFoundError.
   */
  async findById(
    userId: string | mongoose.Types.ObjectId
  ): Promise<IUserDocument> {
    if (!userId) throw new BadRequestError("User ID is required");

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    return user;
  }

  /**
   * Finds a user by ID within the scope of a specific company.
   * Prevents cross-company access.
   *
   * @param userId - User ID to search.
   * @param companyId - Company ID to scope the query.
   * @throws BadRequestError when User ID is missing
   * @throws BadRequestError when Company ID is missing
   * @throws NotFoundError when user not found in company
   * @returns The user if found, otherwise throws.
   */
  async findByIdWithinCompany(
    userId: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IUserDocument> {
    if (!userId) throw new BadRequestError("User ID is required");

    if (!companyId) throw new BadRequestError("Company ID is required");

    const user = await this.userRepository.findByIdWithinCompany(
      userId,
      companyId
    );
    if (!user) throw new NotFoundError("User not found in your company");

    return user;
  }

  /**
   * Creates a new user.
   *
   * @param userData - Partial user data.
   * @throws BadRequestError when email is missing
   * @throws BadRequestError when name is missing
   * @throws BadRequestError when role is missing
   * @throws BadRequestError Email already in use
   * @returns Created user.
   */
  async createUser(
    companyId: mongoose.Types.ObjectId | string,
    userData: Partial<IUserDocument>
  ): Promise<IUserDocument> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    const normalizedCompanyId =
      typeof companyId === "string"
        ? new mongoose.Types.ObjectId(companyId)
        : companyId;

    userData.companyId = normalizedCompanyId;

    if (!userData.email) throw new BadRequestError("Email is missing");
    if (!userData.name) throw new BadRequestError("Name is missing");
    if (!userData.role) throw new BadRequestError("Role is missing");

    const subscription = await this.subscriptionRepository.findOne({
      companyId: normalizedCompanyId,
      status: "active",
    });

    if (!subscription) {
      throw new BadRequestError("No active subscription found for company.");
    }

    const userCount = await this.userRepository.countActiveUsersByCompany(
      normalizedCompanyId
    );

    console.warn(userCount);

    if (userCount >= subscription.allowedUsers) {
      throw new BadRequestError(
        "User limit reached for current subscription plan."
      );
    }

    const existing = await this.userRepository.findByEmail(userData.email);
    if (existing) throw new BadRequestError("Email already in use");

    return this.userRepository.create(userData);
  }

  /**
   * Retrieves paginated users for a specific company.
   *
   * @param companyId - Company ID.
   * @param isActive - Optional filter for active users.
   * @param role - Optional role filter.
   * @param page - Page number.
   * @param limit - Page size.
   * @returns Users and pagination metadata.
   */
  async getUsersByCompany(
    companyId: mongoose.Types.ObjectId,
    isActive?: boolean,
    role?: "employee" | "company_admin",
    name?: string,
    page = 1,
    limit = 20
  ): Promise<{ users: IUserDocument[]; total: number }> {
    if (!companyId) throw new BadRequestError("Company ID is required");

    return this.userRepository.findByCompanyId(
      companyId,
      isActive,
      role,
      name,
      page,
      limit
    );
  }

  /**
   * Updates a user.
   * Fields like `role` or `companyId` should be filtered out beforehand.
   *
   * @param userId - ID of the user to update.
   * @param updates - Allowed update fields (e.g., name, email).
   * @param companyId - Used to scope the update to same company.
   * @throws BadRequestError when User ID is missing
   * @throws BadRequestError when Company ID is missing
   * @throws NotFoundError when user not found in company
   * @returns The updated user.
   */
  async updateUser(
    userId: string,
    updates: Partial<IUserDocument>,
    companyId: mongoose.Types.ObjectId
  ): Promise<IUserDocument> {
    if (!userId) throw new BadRequestError("User ID is missing");

    if (!companyId) throw new BadRequestError("Company ID is missing");

    const user = await this.userRepository.findByIdWithinCompany(
      userId,
      companyId
    );
    if (!user) throw new NotFoundError("User not found");

    return this.userRepository.update(
      userId,
      updates
    ) as Promise<IUserDocument>;
  }

  async toggleActivationStatus(
    userId: string | mongoose.Types.ObjectId,
    companyId: string | mongoose.Types.ObjectId
  ) {
    if (!userId) throw new BadRequestError("User ID is missing");
    if (!companyId) throw new BadRequestError("Company ID is missing");

    const normalizedCompanyId =
      typeof companyId === "string"
        ? new mongoose.Types.ObjectId(companyId)
        : companyId;

    const user = await this.userRepository.findByIdWithinCompany(
      userId,
      normalizedCompanyId
    );

    if (!user) throw new NotFoundError("User not found");

    // Deactivate immediately
    if (user.isActive) {
      user.isActive = false;
      return await this.userRepository.update(user.id, user);
    }

    // Enforce limits on activation
    const subscription = await this.subscriptionRepository.findOne({
      companyId: normalizedCompanyId,
      status: "active",
    });

    if (!subscription) {
      throw new BadRequestError("No active subscription found.");
    }

    const activeUsers = await this.userRepository.countActiveUsersByCompany(
      normalizedCompanyId
    );

    if (activeUsers >= subscription.allowedUsers) {
      throw new BadRequestError("Cannot activate user: user limit reached.");
    }

    user.isActive = true;
    return await this.userRepository.update(user.id, user);
  }

  /**
   * Counts all users for a given company.
   *
   * @param companyId - Company ID.
   * @throws BadRequestError when Company ID is missing
   * @returns Total user count.
   */
  async countUsersByCompany(
    companyId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    if (!companyId) throw new BadRequestError("Company ID is required");
    return this.userRepository.countByCompany(companyId);
  }

  /**
   * Counts only active users within a company.
   *
   * @param companyId - Company ID.
   * @throws BadRequestError when Company ID is missing
   * @returns Active user count.
   */
  async countActiveUsersByCompany(
    companyId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    if (!companyId) throw new BadRequestError("Company ID is required");
    return this.userRepository.countActiveUsersByCompany(companyId);
  }

  async updateUserWithAccessControl(
    actingUserId: string,
    actingUserRole: "employee" | "company_admin" | "super_admin",
    targetUserId: string,
    companyId: mongoose.Types.ObjectId,
    updates: Partial<IUserDocument>
  ): Promise<IUserDocument> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    const isSelf = actingUserId === targetUserId;
    const isAdmin = actingUserRole === "company_admin";

    if (!isAdmin && !isSelf) {
      throw new UnauthorizedError("You are not authorized to update this user");
    }

    const user = await this.userRepository.findByIdWithinCompany(
      targetUserId,
      companyId
    );
    if (!user) throw new NotFoundError("User not found");

    let allowedFields: (keyof IUserDocument)[] = [];

    if (isAdmin && isSelf) {
      allowedFields = ["name", "email"];
    } else if (isAdmin && !isSelf) {
      allowedFields = ["name", "email", "role", "isActive"];
    } else if (!isAdmin && isSelf) {
      allowedFields = ["name", "email"];
    }

    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) =>
        allowedFields.includes(key as keyof IUserDocument)
      )
    );

    // If admin attempts to activate a user, enforce subscription user limit
    if (
      isAdmin &&
      !isSelf &&
      "isActive" in safeUpdates &&
      safeUpdates.isActive === true &&
      user.isActive === false // only validate when going from inactive to active
    ) {
      const subscription = await this.subscriptionRepository.findOne({
        companyId,
        status: "active",
      });

      if (!subscription) {
        throw new BadRequestError("No active subscription found.");
      }

      const activeUsers = await this.userRepository.countActiveUsersByCompany(
        companyId
      );

      if (activeUsers >= subscription.allowedUsers) {
        throw new BadRequestError("Cannot activate user: user limit reached.");
      }
    }

    return this.userRepository.update(user.id, {
      ...user,
      ...safeUpdates,
    }) as Promise<IUserDocument>;
  }
}
