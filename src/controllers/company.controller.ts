// src/controllers/company.controller.ts
import { Request, Response, NextFunction } from 'express';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { CompanyService } from '../services/company.service';

const companyService = new CompanyService();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.registerCompany(req.body);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
};

export const getCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) throw new BadRequestError('User companyId missing');

    const company = await companyService.getCompanyById(companyId);
    res.json(company);
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: userId, companyId } = req.user!;
    if (!userId || !companyId) {
      throw new BadRequestError('User ID or Company ID missing');
    }

    const updatedCompany = await companyService.updateCompanyById(userId, companyId, req.body);
    res.json(updatedCompany);
  } catch (error) {
    next(error);
  }
};

export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.id;
    const { subscriptionPlanId } = req.body;

    if (!subscriptionPlanId) {
      return res.status(400).json({ message: 'Missing subscriptionPlanId' });
    }

    const company = await companyService.updateSubscription(companyId, subscriptionPlanId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json(company);
  } catch (error) {
    next(error);
  }
};