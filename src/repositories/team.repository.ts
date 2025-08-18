import { Service } from "typedi";
import mongoose, { FilterQuery, Types } from "mongoose";
import { TeamModel, ITeamDocument } from "../models/entities/team.entity";

@Service()
export class TeamRepository {
  /**
   * Retrieves a paginated list of teams belonging to a company with populated user details.
   *
   * Supports filtering by team name, activity status, and creation date.
   *
   * @param companyId - The ObjectId of the company
   * @param name - Optional name filter (partial match, case-insensitive)
   * @param isActive - Optional boolean to filter active/inactive teams
   * @param createdAfter - Optional filter for teams created after this date
   * @param page - Page number for pagination (default: 1)
   * @param limit - Maximum results per page (default: 20)
   *
   * @returns Promise with paginated `teams` array and `total` count
   */
  async findByFilters(
    companyId: mongoose.Types.ObjectId,
    name?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortOrder = 1
  ): Promise<{ teams: ITeamDocument[]; total: number }> {
    const filter: FilterQuery<ITeamDocument> = { companyId };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (createdAfter) {
      filter.createdAt = { $gte: createdAfter };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder;

    const [teams, total] = await Promise.all([
      TeamModel.find(filter)
        .populate("users.user")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      TeamModel.countDocuments(filter).exec(),
    ]);

    return { teams, total };
  }

  /**
   * Persists a new team document to the database.
   *
   * @param data - The team document instance to save
   * @returns Promise resolving to the saved team
   */
  async create(data: ITeamDocument) {
    return await data.save();
  }

  /**
   * Retrieves a team document by ID with populated user details.
   *
   * @param id - The ObjectId or string ID of the team
   * @returns Promise resolving to the found team (with users populated) or null
   */
  async findById(id: Types.ObjectId | string) {
    return await TeamModel.findById(id).populate("users.user").exec();
  }

  /**
   * Retrieves a single team matching filter with populated user details.
   *
   * @param filter - MongoDB filter object
   * @returns Promise resolving to the first matching team (with users) or null
   */
  async findOne(filter: FilterQuery<ITeamDocument>) {
    return await TeamModel.findOne(filter)
      .populate("users.user") // Populate user details
      .exec();
  }

  /**
   * Updates a team by ID and returns the updated document with populated users.
   *
   * @param id - The ObjectId or string ID of the team
   * @param updates - Partial team fields to update
   * @returns Promise resolving to the updated team (with populated users) or null
   */
  async update(id: Types.ObjectId | string, updates: Partial<ITeamDocument>) {
    return await TeamModel.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .populate("users.user")
      .exec();
  }

  /**
   * Permanently deletes a team document by ID.
   *
   * @param id - The ObjectId or string ID of the team
   * @returns Promise resolving to the deleted team or null
   */
  async delete(id: Types.ObjectId | string) {
    return await TeamModel.findByIdAndDelete(id).exec();
  }

  async getTeamsForUser(
    companyId: Types.ObjectId,
    userId: Types.ObjectId,
    isActiveFlag?: boolean
  ) {
    const filter: FilterQuery<ITeamDocument> = {
      companyId,
      "users.user": userId,
    };

    if (isActiveFlag) {
      filter.isActive = isActiveFlag;
    }

    return await TeamModel.find(filter).exec();
  }
}
