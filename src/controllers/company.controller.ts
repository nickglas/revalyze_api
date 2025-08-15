// src/controllers/company.controller.ts
import { Request, Response, NextFunction } from "express";
import { BadRequestError, ForbiddenError } from "../utils/errors";
import { Container } from "typedi";
import { CompanyService } from "../services/company.service";
import { RegisterCompanyDto } from "../dto/company/register.company.dto";
import { UpdateCompanyDto } from "../dto/company/update.company.dto";

export const register = async (
  req: Request<{}, {}, RegisterCompanyDto>,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyService = Container.get(CompanyService);
    const company = await companyService.registerCompany(req.body);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
};

export const getCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) throw new BadRequestError("User companyId missing");

    const companyService = Container.get(CompanyService);
    const company = await companyService.getCompanyById(companyId);
    res.json(company);
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new ForbiddenError("User ID or Company ID missing");
    }

    const dto: UpdateCompanyDto = req.body;
    const companyService = Container.get(CompanyService);
    const updatedCompany = await companyService.updateCompanyById(
      companyId,
      dto
    );

    res.json(updatedCompany);
  } catch (error) {
    next(error);
  }
};

export const updateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.companyId;
    const { priceId } = req.body;

    if (!companyId) throw new BadRequestError("User companyId missing");
    if (!priceId) throw new BadRequestError("Missing priceId");

    const companyService = Container.get(CompanyService);
    return res.json(
      await companyService.updateSubscription(companyId, priceId)
    );
  } catch (error) {
    next(error);
  }
};

export const cancelScheduledSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) throw new BadRequestError("User companyId missing");

    const companyService = Container.get(CompanyService);
    const result = await companyService.cancelScheduledSubscriptionByCompanyId(
      companyId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const cancelSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) throw new BadRequestError("User companyId missing");

    const companyService = Container.get(CompanyService);
    const result = await companyService.cancelSubscriptions(companyId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
