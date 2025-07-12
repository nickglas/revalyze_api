// test/unit/services/company.service.spec.ts
import { CompanyService } from "../../../services/company.service";
import { RegisterCompanyDto } from "../../../dto/company/register.company.dto";
import { BadRequestError } from "../../../utils/errors";
import { mapRegisterDtoToPendingCompany } from "../../../mappers/company.mapper";
import bcrypt from "bcrypt";
import { StripeService } from "../../../services/stripe.service";
import { CompanyRepository } from "../../../repositories/company.repository";
import { UserRepository } from "../../../repositories/user.repository";
import { PendingCompanyRepository } from "../../../repositories/pending.repository";
import { ReviewConfigService } from "../../../services/review.config.service";
import { ApiKeyService } from "../../../services/key.service";
import { SubscriptionRepository } from "../../../repositories/subscription.repository";

jest.mock("bcrypt");
jest.mock("../../../mappers/company.mapper", () => ({
  mapRegisterDtoToPendingCompany: jest.fn(),
}));

const validDto: RegisterCompanyDto = {
  companyName: "TestCompany",
  companyMainEmail: "test@company.com",
  companyPhone: "+3112345678",
  address: "123 Main St",
  subscriptionPlanId: "plan_123",
  adminName: "Admin",
  adminEmail: "admin@company.com",
  password: "StrongP@ssw0rd!",
  passwordConfirm: "StrongP@ssw0rd!",
};

describe("CompanyService - registerCompany", () => {
  let companyService: CompanyService;
  let stripeService: jest.Mocked<StripeService>;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let pendingRepository: jest.Mocked<PendingCompanyRepository>;
  let reviewConfigService: jest.Mocked<ReviewConfigService>;
  let apiKeyService: jest.Mocked<ApiKeyService>;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;

  beforeEach(() => {
    stripeService = {
      createCustomer: jest.fn(),
      createCheckoutSession: jest.fn(),
      deleteCustomer: jest.fn(),
    } as any;

    companyRepository = {
      findOne: jest.fn(),
    } as any;

    userRepository = {
      findByEmail: jest.fn(),
    } as any;

    pendingRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
    } as any;

    reviewConfigService = {} as any;
    apiKeyService = {} as any;
    subscriptionRepository = {} as any;

    companyService = new CompanyService(
      stripeService,
      companyRepository,
      userRepository,
      pendingRepository,
      reviewConfigService,
      apiKeyService,
      subscriptionRepository
    );

    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
  });

  it("should register company successfully and return checkoutUrl", async () => {
    companyRepository.findOne.mockResolvedValue(null);
    pendingRepository.findOne.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue(null);

    stripeService.createCustomer.mockResolvedValue({ id: "cus_123" } as any);
    stripeService.createCheckoutSession.mockResolvedValue({
      id: "sess_123",
      url: "https://checkout.stripe.com/sess_123",
      expires_at: 1234567890,
    } as any);

    (mapRegisterDtoToPendingCompany as jest.Mock).mockReturnValue({
      mocked: true,
    });

    const result = await companyService.registerCompany(validDto);

    expect(result).toEqual({
      checkoutUrl: "https://checkout.stripe.com/sess_123",
    });
    expect(pendingRepository.create).toHaveBeenCalledWith({ mocked: true });
  });

  it("should throw if company already exists", async () => {
    companyRepository.findOne.mockResolvedValue({} as any);

    await expect(companyService.registerCompany(validDto)).rejects.toThrow(
      BadRequestError
    );
  });

  it("should throw if pending registration exists", async () => {
    companyRepository.findOne.mockResolvedValue(null);
    pendingRepository.findOne.mockResolvedValue({} as any);

    await expect(companyService.registerCompany(validDto)).rejects.toThrow(
      BadRequestError
    );
  });

  it("should throw if admin already exists", async () => {
    companyRepository.findOne.mockResolvedValue(null);
    pendingRepository.findOne.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue({} as any);

    await expect(companyService.registerCompany(validDto)).rejects.toThrow(
      BadRequestError
    );
  });

  it("should throw if Stripe customer creation fails", async () => {
    companyRepository.findOne.mockResolvedValue(null);
    pendingRepository.findOne.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue(null);
    stripeService.createCustomer.mockResolvedValue(null as any);

    await expect(companyService.registerCompany(validDto)).rejects.toThrow(
      BadRequestError
    );
  });

  it("should throw if Stripe session creation fails", async () => {
    companyRepository.findOne.mockResolvedValue(null);
    pendingRepository.findOne.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue(null);
    stripeService.createCustomer.mockResolvedValue({ id: "cus_123" } as any);
    stripeService.createCheckoutSession.mockResolvedValue(null as any);

    await expect(companyService.registerCompany(validDto)).rejects.toThrow(
      BadRequestError
    );
  });

  it("should rollback Stripe customer if pending save fails", async () => {
    companyRepository.findOne.mockResolvedValue(null);
    pendingRepository.findOne.mockResolvedValue(null);
    userRepository.findByEmail.mockResolvedValue(null);
    stripeService.createCustomer.mockResolvedValue({ id: "cus_123" } as any);
    stripeService.createCheckoutSession.mockResolvedValue({
      id: "sess_123",
      url: "https://checkout.stripe.com/sess_123",
      expires_at: 1234567890,
    } as any);

    (mapRegisterDtoToPendingCompany as jest.Mock).mockReturnValue({});
    pendingRepository.create.mockRejectedValue(new Error("DB Error"));

    await expect(companyService.registerCompany(validDto)).rejects.toThrow(
      "DB Error"
    );
    expect(stripeService.deleteCustomer).toHaveBeenCalledWith("cus_123");
  });
});
