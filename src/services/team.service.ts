// src/services/team.service.ts
import { Service } from "typedi";
import mongoose, { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { TeamRepository } from "../repositories/team.repository";
import { ITeamDocument, TeamModel } from "../models/entities/team.entity";
import { CreateTeamDto } from "../dto/team/team.create.dto";
import { UserRepository } from "../repositories/user.repository";
import {
  UpdateTeamDTO,
  UpdateTeamServiceDTO,
} from "../dto/team/update.team.dto";

@Service()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Creates a new team associated with a company.
   *
   * Validates all user IDs exist and checks for duplicate team names.
   *
   * @param companyId - The ObjectId of the authenticated company.
   * @param dto - The data transfer object containing team details.
   * @returns Promise resolving to the created team document.
   *
   * @throws BadRequestError if companyId is missing.
   * @throws BadRequestError if duplicate team name exists.
   * @throws BadRequestError if any user ID is invalid or duplicate.
   * @throws NotFoundError if any referenced user doesn't exist.
   */
  async createTeam(
    companyId: Types.ObjectId,
    dto: CreateTeamDto
  ): Promise<ITeamDocument> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    // Check for duplicate team name within the company
    const existingTeam = await this.teamRepository.findOne({
      name: dto.name,
      companyId,
    });
    if (existingTeam) {
      throw new BadRequestError(
        "A team with this name already exists in your company"
      );
    }

    // Validate all user IDs
    const userIds = dto.users.map((u) => new Types.ObjectId(u.userId));
    const uniqueUserIds = [...new Set(userIds.map((id) => id.toString()))];

    if (uniqueUserIds.length !== userIds.length) {
      throw new BadRequestError("Duplicate user IDs in team members");
    }

    // Verify all users exist
    const usersExist = await this.userRepository.countDocuments({
      _id: { $in: userIds },
      companyId,
    });
    if (usersExist !== userIds.length) {
      throw new NotFoundError("One or more users not found");
    }

    // Create team document instance
    const team = new TeamModel({
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
      companyId,
      users: dto.users.map((user) => ({
        user: new Types.ObjectId(user.userId),
        isManager: user.isManager || false,
      })),
    });

    const newTeam = await this.teamRepository.create(team);
    return await this.getById(newTeam.id, companyId);
  }

  /**
   * Updates a team owned by the specified company.
   *
   * @param companyId - The ObjectId of the parent company.
   * @param teamId - The ObjectId of the team to update.
   * @param updates - The fields to update.
   * @returns Promise resolving to the updated team document.
   *
   * @throws BadRequestError if any ID is missing.
   * @throws NotFoundError if the team doesn't exist under this company.
   * @throws BadRequestError if trying to change to a duplicate team name.
   */
  async updateTeam(
    companyId: Types.ObjectId,
    teamId: Types.ObjectId,
    updates: UpdateTeamDTO
  ): Promise<ITeamDocument | null> {
    if (!companyId) throw new BadRequestError("Company ID is missing");
    if (!teamId) throw new BadRequestError("Team ID is missing");

    const existingTeam = await this.teamRepository.findOne({
      _id: teamId,
      companyId,
    });
    if (!existingTeam) {
      throw new NotFoundError(`Team with id ${teamId} not found`);
    }

    if (updates.name && updates.name !== existingTeam.name) {
      const nameExists = await this.teamRepository.findOne({
        name: updates.name,
        companyId,
        _id: { $ne: teamId },
      });
      if (nameExists) {
        throw new BadRequestError(
          "Another team already has this name in your company"
        );
      }
    }

    const serviceUpdates: UpdateTeamServiceDTO = {
      name: updates.name,
      description: updates.description,
      isActive: updates.isActive,
    };

    console.warn("First");
    console.warn(updates.users);
    if (updates.users) {
      serviceUpdates.users = updates.users.map((u) => ({
        user: new mongoose.Types.ObjectId(u.userId),
        isManager: u.isManager,
      }));
    }

    console.warn("Second");
    console.warn(updates.users);
    return this.teamRepository.update(teamId, serviceUpdates);
  }

  /**
   * Retrieves a single team owned by the specified company.
   *
   * @param teamId - The ObjectId of the team.
   * @param companyId - The ObjectId of the parent company.
   * @returns Promise resolving to the team document.
   *
   * @throws BadRequestError if any ID is missing.
   * @throws NotFoundError if team is not found.
   */
  async getById(
    teamId: Types.ObjectId,
    companyId: Types.ObjectId
  ): Promise<ITeamDocument> {
    if (!companyId) throw new BadRequestError("Company ID is missing");
    if (!teamId) throw new BadRequestError("Team ID is missing");

    const team = await this.teamRepository.findOne({
      _id: teamId,
      companyId,
    });

    if (!team) throw new NotFoundError(`Team with id ${teamId} not found`);
    return team;
  }

  /**
   * Retrieves paginated list of teams belonging to a specific company.
   * Supports filters: name, isActive, createdAfter.
   *
   * @param companyId - The ObjectId of the company.
   * @param name - Optional name filter.
   * @param isActive - Optional activity status filter.
   * @param createdAfter - Optional date filter.
   * @param page - Page number.
   * @param limit - Page size.
   * @returns Promise resolving to `{ teams, total }`.
   *
   * @throws BadRequestError if companyId is missing.
   */
  async getTeams(
    companyId: Types.ObjectId,
    name?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20,
    sortBy = "name",
    sortOrder = 1
  ): Promise<{ teams: ITeamDocument[]; total: number }> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    return this.teamRepository.findByFilters(
      companyId,
      name,
      isActive,
      createdAfter,
      page,
      limit,
      sortBy,
      sortOrder
    );
  }

  /**
   * Toggles the `isActive` status of a team.
   *
   * @param teamId - The ObjectId of the team.
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to the updated team.
   *
   * @throws BadRequestError if IDs are missing.
   * @throws NotFoundError if team not found.
   */
  async toggleIsActive(
    teamId: Types.ObjectId,
    companyId: Types.ObjectId
  ): Promise<ITeamDocument | null> {
    if (!companyId) throw new BadRequestError("Company ID is missing");
    if (!teamId) throw new BadRequestError("Team ID is missing");

    const team = await this.teamRepository.findOne({
      _id: teamId,
      companyId,
    });
    if (!team) throw new NotFoundError(`Team with id ${teamId} not found`);

    return this.teamRepository.update(teamId, {
      isActive: !team.isActive,
    });
  }

  /**
   * Deletes a team belonging to the given company.
   *
   * @param teamId - The ObjectId of the team.
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to the deleted team or null.
   *
   * @throws BadRequestError if IDs are missing.
   * @throws NotFoundError if team is not found.
   */
  async deleteTeam(
    teamId: Types.ObjectId,
    companyId: Types.ObjectId
  ): Promise<ITeamDocument | null> {
    if (!companyId) throw new BadRequestError("Company ID is missing");
    if (!teamId) throw new BadRequestError("Team ID is missing");

    const team = await this.teamRepository.findOne({
      _id: teamId,
      companyId,
    });
    if (!team) throw new NotFoundError(`Team with id ${teamId} not found`);

    return this.teamRepository.delete(teamId);
  }
}
