import { NextFunction, Request, Response } from "express";
import { Container } from "typedi";
import mongoose from "mongoose";
import { CriteriaService } from "../services/criteria.service";

/**
 * Controller to handle GET /criteria
 * Retrieves a paginated list of criteria filtered by company ID and optional search term.
 *
 * Query Parameters:
 *  - search (optional): string to search within title and description
 *  - page (optional): page number for pagination (default: 1)
 *  - limit (optional): number of items per page (default: 20)
 *
 * Requires authenticated user with `companyId` in `req.user`.
 *
 * Response:
 *  - 200 OK with JSON containing `data` array of criteria and `meta` pagination info
 *  - Passes errors to next middleware (e.g. error handler)
 */
export const getCriteria = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const search = req.query.search?.toString();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const criteriaService = Container.get(CriteriaService);

    const { criteria, total } = await criteriaService.getCriteria(
      companyId,
      search,
      page,
      limit
    );

    res.status(200).json({
      data: criteria,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /criteria
 * Creates a new criterion for the authenticated user's company.
 *
 * Request Body:
 *  - title: string (required)
 *  - description: string (required)
 *  - isActive: boolean (optional, defaults to true)
 *
 * Requires authenticated user with `companyId` in `req.user`.
 *
 * Response:
 *  - 201 Created with JSON of the newly created criterion
 *  - Passes errors to next middleware (e.g. error handler)
 */
export const createCriterion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const dto = req.body;
    const criteriaService = Container.get(CriteriaService);

    const newCriterion = await criteriaService.createCriterion(companyId, dto);
    res.status(201).json(newCriterion);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /criteria/:id/status
 * Updates the `isActive` status of a criterion for the authenticated user's company.
 *
 * URL Parameters:
 *  - id: string (criterion ID)
 *
 * Request Body:
 *  - isActive: boolean (required)
 *
 * Requires authenticated user with `companyId` in `req.user`.
 *
 * Response:
 *  - 200 OK with JSON of the updated criterion
 *  - 400 Bad Request if `isActive` is not boolean
 *  - Passes errors to next middleware (e.g. error handler)
 */
export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ message: "isActive must be boolean" });
      return;
    }
    const criteriaService = Container.get(CriteriaService);
    const updatedCriterion = await criteriaService.updateStatus(
      id,
      companyId,
      isActive
    );
    res.status(200).json(updatedCriterion);
  } catch (error) {
    next(error);
  }
};
