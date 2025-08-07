// src/controllers/team.controller.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Container } from "typedi";
import { TeamService } from "../services/team.service";
import { CreateTeamDto } from "../dto/team/team.create.dto";
import { UpdateTeamDTO } from "../dto/team/update.team.dto";

/**
 * Controller to handle GET /teams
 * Retrieves paginated list of teams for a company.
 */
export const getTeams = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const name = req.query.name?.toString();
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;
    const createdAfter = req.query.createdAfter
      ? new Date(req.query.createdAfter as string)
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sortBy?.toString() || "name";
    const sortOrder = req.query.sortOrder?.toString() === "desc" ? -1 : 1;

    const teamService = Container.get(TeamService);
    const { teams, total } = await teamService.getTeams(
      companyId,
      name,
      isActive,
      createdAfter,
      page,
      limit,
      sortBy,
      sortOrder
    );

    res.status(200).json({
      data: teams,
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
 * Controller to handle GET /teams/:id
 * Retrieves a single team by ID.
 */
export const getTeamById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const teamId = new mongoose.Types.ObjectId(req.params.id);

    const teamService = Container.get(TeamService);
    const team = await teamService.getById(teamId, companyId);
    res.status(200).json(team);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle POST /teams
 * Creates a new team.
 */
export const createTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const dto: CreateTeamDto = req.body;

    const teamService = Container.get(TeamService);
    const team = await teamService.createTeam(companyId, dto);

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle PATCH /teams/:id
 * Updates a team by ID.
 */
export const updateTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const updates: UpdateTeamDTO = req.body;

    const teamService = Container.get(TeamService);
    const updated = await teamService.updateTeam(companyId, teamId, updates);

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle PATCH /teams/:id/status
 * Toggles the active status of a team.
 */
export const toggleTeamStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const teamId = new mongoose.Types.ObjectId(req.params.id);

    const teamService = Container.get(TeamService);
    const updated = await teamService.toggleIsActive(teamId, companyId);

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to handle DELETE /teams/:id
 * Deletes a team by ID.
 */
export const deleteTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const teamId = new mongoose.Types.ObjectId(req.params.id);

    const teamService = Container.get(TeamService);
    const deleted = await teamService.deleteTeam(teamId, companyId);

    res.status(200).json(deleted);
  } catch (err) {
    next(err);
  }
};
