// src/types/pending.company.type.ts
export interface IPendingCompanyData {
  stripeSessionId: string;
  stripeCustomerId: string;
  stripePaymentLink: string;
  stripeSessionExpiresAtTimestamp: number;
  companyName: string;
  companyMainEmail: string;
  companyPhone?: string;
  address: string | any;
  adminName: string;
  adminEmail: string;
  password: string;
  lastAttempt?: Date;
  attemptCount: number;
}
