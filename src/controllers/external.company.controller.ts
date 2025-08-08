import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import mongoose from "mongoose";
import { ExternalCompanyService } from "../services/external.company.service";

/**
 * GET /external-companies
 * Fetch paginated external companies filtered by name, active status, and creation date.
 */
export const getExternalCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const name = req.query.name?.toString();
    const email = req.query.email?.toString();
    const phone = req.query.phone?.toString();
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;
    const createdAfter = req.query.createdAfter
      ? new Date(req.query.createdAfter.toString())
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sortBy?.toString() || "name";
    const sortOrder = req.query.sortOrder?.toString() === "desc" ? -1 : 1;

    const externalCompanyService = Container.get(ExternalCompanyService);
    const { companies, total } =
      await externalCompanyService.getExternalCompanies(
        companyId,
        name,
        email,
        phone,
        isActive,
        createdAfter,
        page,
        limit,
        sortBy,
        sortOrder
      );

    res.status(200).json({
      data: companies,
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
 * GET /external-companies/:id
 * Fetch a specific external company by ID.
 */
export const getExternalCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;

    const externalCompanyService = Container.get(ExternalCompanyService);
    const company = await externalCompanyService.getById(
      new mongoose.Types.ObjectId(id),
      companyId
    );

    res.status(200).json(company);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /external-companies
 * Create a new external company.
 */
export const createExternalCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const dto = req.body;

    const externalCompanyService = Container.get(ExternalCompanyService);
    const newCompany = await externalCompanyService.createExternalCompany(
      dto,
      companyId
    );

    res.status(201).json(newCompany);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /external-companies/:id
 * Update details of an external company.
 */
export const updateExternalCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const externalCompanyId = new mongoose.Types.ObjectId(req.params.id);
    const updates = req.body;

    const externalCompanyService = Container.get(ExternalCompanyService);
    const updated = await externalCompanyService.updateExternalCompany(
      companyId,
      externalCompanyId,
      updates
    );

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /external-companies/:id/toggle-status
 * Toggle the isActive status of an external company.
 */
export const toggleIsActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const externalCompanyId = new mongoose.Types.ObjectId(req.params.id);

    const externalCompanyService = Container.get(ExternalCompanyService);
    const updated = await externalCompanyService.toggleIsActive(
      externalCompanyId,
      companyId
    );

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /external-companies/:id
 * Permanently delete an external company.
 */
export const deleteExternalCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const externalCompanyId = new mongoose.Types.ObjectId(req.params.id);

    const externalCompanyService = Container.get(ExternalCompanyService);
    const deleted = await externalCompanyService.deleteExternalCompany(
      externalCompanyId,
      companyId
    );

    res.status(200).json(deleted);
  } catch (error) {
    next(error);
  }
};
