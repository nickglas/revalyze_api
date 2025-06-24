// src/controllers/company.controller.ts
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../utils/errors";
import { Container } from "typedi";
import { CompanyService } from "../services/company.service";
import { RegisterCompanyDto } from "../dto/company/register.company.dto";

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
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    if (!userId || !companyId) {
      throw new BadRequestError("User ID or Company ID missing");
    }

    const companyService = Container.get(CompanyService);
    const updatedCompany = await companyService.updateCompanyById(
      userId,
      companyId,
      req.body
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
