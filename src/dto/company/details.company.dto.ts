// src/dto/company/company.detailed.dto.ts

import { SubscriptionDetailsDto } from "../subscriptions/detailed.subscription.dto";

export class CompanyDetailsDto {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  subscription?: SubscriptionDetailsDto;

  constructor(company: any) {
    this._id = company._id.toString();
    this.name = company.name;
    this.email = company.mainEmail;
    this.phone = company.phone;
    this.address = company.address;
    this.isActive = company.isActive;
    this.createdAt = company.createdAt;
    this.updatedAt = company.updatedAt;
  }

  // Add method to set subscription separately
  setSubscription(subscription: any) {
    this.subscription = subscription
      ? new SubscriptionDetailsDto(subscription)
      : undefined;
  }
}
