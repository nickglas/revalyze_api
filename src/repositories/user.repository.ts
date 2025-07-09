// src/repositories/user.repository.ts
import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import User, { IUser } from "../models/user.model";

@Service()
export class UserRepository {
  /**
   * Retrieves a user by their email address.
   * Commonly used for authentication and duplicate email validation.
   *
   * @param email - Email address of the user.
   * @returns The found user document or null.
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email }).exec();
  }

  /**
   * Retrieves a user by their unique MongoDB `_id`.
   *
   * @param id - The ObjectId or string ID of the user to retrieve.
   * @returns The found user document or null.
   */
  async findById(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    return await User.findById(id).exec();
  }

  /**
   * Retrieves paginated users for a specific company, with optional filters.
   *
   * @param companyId - The company ID.
   * @param isActive - Optional filter by activity status.
   * @param role - Optional role filter ('employee' | 'company_admin')
   * @param page - Page number (default: 1).
   * @param limit - Results per page (default: 20).
   * @returns Object with paginated users and total count.
   */
  async findByCompanyId(
    companyId: string | mongoose.Types.ObjectId,
    isActive?: boolean,
    role?: "employee" | "company_admin",
    page = 1,
    limit = 20
  ): Promise<{ users: IUser[]; total: number }> {
    const filter: FilterQuery<IUser> = { companyId };

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (role) {
      filter.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).select("-password").exec(),
      User.countDocuments(filter).exec(),
    ]);

    return { users, total };
  }

  /**
   * Creates a new user document.
   *
   * @param userData - Partial user data to insert.
   * @returns The created user document.
   */
  async create(userData: Partial<IUser>): Promise<IUser> {
    return await User.create(userData);
  }

  /**
   * Updates a user by ID with provided fields.
   *
   * @param id - User ID to update.
   * @param updates - Fields to update.
   * @returns The updated user document or null if not found.
   */
  async update(
    id: string | mongoose.Types.ObjectId,
    updates: Partial<IUser>
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, updates, { new: true }).exec();
  }

  /**
   * Soft deletes a user by setting `isActive = false`.
   *
   * @param id - The ObjectId or string ID of the user.
   * @returns The updated (deactivated) user or null.
   */
  async deactivate(
    id: string | mongoose.Types.ObjectId
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).exec();
  }

  /**
   * Reactivates a previously deactivated user by setting `isActive = true`.
   *
   * @param id - The ObjectId or string ID of the user.
   * @returns The updated (reactivated) user or null.
   */
  async activate(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    ).exec();
  }

  /**
   * Permanently deletes a user (hard delete).
   * ⚠️ Use with caution — data cannot be recovered.
   *
   * @param id - The ObjectId or string ID of the user to delete.
   * @returns The deleted user or null.
   */
  async delete(id: string | mongoose.Types.ObjectId): Promise<IUser | null> {
    return await User.findByIdAndDelete(id).exec();
  }
  /**
   * Counts the total number of users in a company.
   *
   * @param companyId - The company ID.
   * @returns Number of users in the company.
   */
  async countByCompany(
    companyId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    return await User.countDocuments({ companyId }).exec();
  }

  /**
   * Counts only the active users within a company.
   *
   * @param companyId - The company ID.
   * @returns Number of active users.
   */
  async countActiveUsersByCompany(
    companyId: string | mongoose.Types.ObjectId
  ): Promise<number> {
    return await User.countDocuments({ companyId, isActive: true }).exec();
  }

  /**
   * Retrieves a user by ID and ensures it belongs to a specific company.
   * Used to prevent cross-company access.
   *
   * @param id - The user ID.
   * @param companyId - The company ID to match.
   * @returns The matching user or null.
   */
  async findByIdWithinCompany(
    id: string | mongoose.Types.ObjectId,
    companyId: string | mongoose.Types.ObjectId
  ): Promise<IUser | null> {
    return await User.findOne({ _id: id, companyId }).exec();
  }
}
