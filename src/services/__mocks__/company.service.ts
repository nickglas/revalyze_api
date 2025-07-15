// __mocks__/company.service.ts
import { BadRequestError } from "../../utils/errors";

export class CompanyService {
  registerCompany = jest.fn().mockImplementation((dto) => {
    if (dto.companyMainEmail === "existing@example.com") {
      throw new BadRequestError("Company with this email already exists");
    }

    return Promise.resolve({ checkoutUrl: "https://mock-checkout-url.com" });
  });

  getCompanyById = jest.fn().mockResolvedValue({
    name: "Revalyze",
    mainEmail: "nickglas@revalyze.io",
    address: "123 Main St",
  });

  updateCompanyById = jest.fn().mockResolvedValue({
    name: "Updated Company",
  });

  updateSubscription = jest.fn().mockResolvedValue({
    url: "https://mock-checkout-url.com",
  });

  cancelScheduledSubscriptionByCompanyId = jest.fn().mockResolvedValue({
    status: "cancelled",
  });

  cancelSubscriptions = jest.fn().mockResolvedValue({
    cancelled: true,
  });
}
