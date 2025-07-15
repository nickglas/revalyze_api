// src/mappers/pending.company.mapper.ts
import { RegisterCompanyDto } from "../dto/company/register.company.dto";
import { ICompanyData } from "../models/types/company.type";
import { IPendingCompanyDocument } from "../models/entities/pending.company.entity";
import { PendingCompanyModel } from "../models/entities/pending.company.entity";

export const mapRegisterDtoToPendingCompany = (
  dto: RegisterCompanyDto & {
    stripeCustomerId: string;
    stripeSessionId: string;
    stripePaymentLink: string;
    stripeSessionExpiresAtTimestamp: number;
    password: string;
  }
): IPendingCompanyDocument => {
  return new PendingCompanyModel({
    ...dto,
    stripeCustomerId: dto.stripeCustomerId,
    stripeSessionId: dto.stripeSessionId,
    stripePaymentLink: dto.stripePaymentLink,
    stripeSessionExpiresAtTimestamp: dto.stripeSessionExpiresAtTimestamp,
  });
};

export const mapPendingToCompany = (
  pending: IPendingCompanyDocument
): ICompanyData => {
  return {
    name: pending.companyName,
    mainEmail: pending.companyMainEmail,
    phone: pending.companyPhone,
    address: pending.address,
    stripeCustomerId: pending.stripeCustomerId,
    isActive: true,
  };
};
