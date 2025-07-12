// src/types/company.type.ts
export interface ICompanyData {
  name: string;
  mainEmail: string;
  phone?: string;
  address: string | any;
  stripeCustomerId: string;
  isActive: boolean;
}
