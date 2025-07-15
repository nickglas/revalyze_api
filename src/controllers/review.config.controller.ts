import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Container } from "typedi";
import { ReviewConfigService } from "../services/review.config.service";
import { BadRequestError } from "../utils/errors";

/**
 * Controller to handle GET /review-configs
 * Retrieves a list of review configurations filtered by optional query parameters.
 *
 * Query Parameters:
 *  - name (optional): string to search by name
 *  - active (optional): boolean to filter by active status
 *  - createdAfter (optional): ISO date string to filter by creation date
 *
 * Requires authenticated user with `companyId` in `req.user`.
 *
 * Response:
 *  - 200 OK with array of matching review configurations
 *  - Passes errors to next middleware (e.g. error handler)
 */
export const getReviewConfigs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { name, active, createdAfter } = req.query;

    const reviewConfigService = Container.get(ReviewConfigService);
    const configs = await reviewConfigService.getReviewConfigs(companyId, {
      name: name?.toString(),
      active: active !== undefined ? active === "true" : undefined,
      createdAfter: createdAfter?.toString(),
    });

    res.status(200).json(configs);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /review-configs/:id
 * Retrieves a specific review configuration by ID.
 *
 * URL Parameters:
 *  - id: string (review config ID)
 *
 * Requires authenticated user with `companyId` in `req.user`.
 *
 * Response:
 *  - 200 OK with the matching review configuration
 *  - 404 Not Found if not found or doesn't belong to the company
 *  - Passes errors to next middleware (e.g. error handler)
 */
export const getReviewConfigById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;

    const reviewConfigService = Container.get(ReviewConfigService);
    const config = await reviewConfigService.getById(id, companyId);

    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /review-configs
 * Creates a new review configuration for the authenticated user's company.
 *
 * Request Body:
 *  - name: string (required)
 *  - criteriaIds: string[] (optional)
 *  - modelSettings: object (optional) with:
 *      - model: string (required)
 *      - temperature: number (0.1–1, optional)
 *      - maxTokens: number (optional)
 *      - top_p: number (optional)
 *
 * Requires authenticated user with `companyId` in `req.user`.
 *
 * Response:
 *  - 201 Created with JSON of the newly created review configuration
 *  - Passes validation and service errors to next middleware
 */
export const createReviewConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const dto = req.body;

    const reviewConfigService = Container.get(ReviewConfigService);
    const created = await reviewConfigService.createReviewConfig(
      companyId,
      dto
    );

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PUT /review-configs/:id
 * Updates an existing review configuration.
 */
export const updateReviewConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;
    const updates = req.body;

    const reviewConfigService = Container.get(ReviewConfigService);
    const updated = await reviewConfigService.updateReviewConfig(
      id,
      companyId,
      updates
    );

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /review-configs/:id
 * Deactivates a review configuration.
 */
export const toggleReviewConfigActivationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid review config ID");
    }

    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);

    const reviewConfigService = Container.get(ReviewConfigService);
    const updated = await reviewConfigService.toggleActivationStatus(
      companyId,
      new mongoose.Types.ObjectId(id)
    );

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle DELETE /review-configs/:id
 * Deletes a review configuration.
 */
export const deleteReviewConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;

    const reviewConfigService = Container.get(ReviewConfigService);

    await reviewConfigService.deleteReviewConfig(id, companyId);

    res.status(204);
  } catch (error) {
    next(error);
  }
};
