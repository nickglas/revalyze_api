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

describe("CompanyService", () => {
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
      getSubscription: jest.fn(),
      getProductById: jest.fn(),
    } as any;

    companyRepository = {
      findOne: jest.fn(),
      findByStripeCustomerId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;

    userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;

    pendingRepository = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;

    reviewConfigService = {
      assignDefaultReviewConfigToCompany: jest.fn(),
    } as any;

    apiKeyService = {
      regenerateApiKey: jest.fn(),
    } as any;

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

    jest.clearAllMocks();
  });

  describe("registerCompany", () => {
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
  describe("activateCompany", () => {
    let companyService: CompanyService;
    let stripeService: jest.Mocked<StripeService>;
    let companyRepository: jest.Mocked<CompanyRepository>;
    let userRepository: jest.Mocked<UserRepository>;
    let pendingRepository: jest.Mocked<PendingCompanyRepository>;
    let reviewConfigService: jest.Mocked<ReviewConfigService>;
    let apiKeyService: jest.Mocked<ApiKeyService>;
    let subscriptionRepository: jest.Mocked<SubscriptionRepository>;

    // Shared mocks and test data
    const pendingMock = {
      _id: "pendingId",
      stripeCustomerId: "cus_123",
      adminEmail: "admin@company.com",
      companyName: "TestCompany",
      companyMainEmail: "test@company.com",
      companyPhone: "+3112345678",
      address: "123 Main St",
      adminName: "Admin",
      password: "hashed_password",
    };

    const subscriptionMock = {
      items: {
        data: [
          {
            price: {
              product: "prod_123",
              recurring: { interval: "month" },
            },
          },
        ],
      },
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
    };

    const productMock = {
      id: "prod_123",
      name: "Test Product",
      metadata: {
        tier: "3",
      },
    };

    const companyMock = {
      _id: "companyId",
      id: "companyId",
      name: "TestCompany",
    };

    const adminUserMock = {
      email: "admin@company.com",
      id: "userId",
    };

    beforeEach(() => {
      stripeService = {
        getSubscription: jest.fn(),
        getProductById: jest.fn(),
      } as any;

      companyRepository = {
        findByStripeCustomerId: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      } as any;

      userRepository = {
        findByEmail: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      } as any;

      pendingRepository = {
        findById: jest.fn(),
        delete: jest.fn(),
      } as any;

      reviewConfigService = {
        assignDefaultReviewConfigToCompany: jest.fn(),
      } as any;

      apiKeyService = {
        regenerateApiKey: jest.fn(),
      } as any;

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
    });

    it("should activate company and admin user successfully", async () => {
      pendingRepository.findById.mockResolvedValue(pendingMock as any);
      stripeService.getSubscription.mockResolvedValue(subscriptionMock as any);
      stripeService.getProductById.mockResolvedValue(productMock as any);
      companyRepository.create.mockResolvedValue(companyMock as any);
      userRepository.create.mockResolvedValue(adminUserMock as any);
      pendingRepository.delete.mockResolvedValue(null);

      // Spy on private methods
      const createCompanyFromPendingSpy = jest
        .spyOn(companyService as any, "createCompanyFromPending")
        .mockResolvedValue(companyMock as any);

      const createAdminUserFromPendingSpy = jest
        .spyOn(companyService as any, "createAdminUserFromPending")
        .mockResolvedValue(adminUserMock as any);

      apiKeyService.regenerateApiKey.mockResolvedValue(null as any);

      const result = await companyService.activateCompany(
        "pendingId",
        "subscriptionId"
      );

      expect(result).toEqual({
        company: companyMock,
        adminUser: adminUserMock,
      });
      expect(pendingRepository.findById).toHaveBeenCalledWith("pendingId");
      expect(stripeService.getSubscription).toHaveBeenCalledWith(
        "subscriptionId"
      );
      expect(stripeService.getProductById).toHaveBeenCalledWith("prod_123");
      expect(createCompanyFromPendingSpy).toHaveBeenCalledWith(pendingMock);
      expect(createAdminUserFromPendingSpy).toHaveBeenCalledWith(
        pendingMock,
        companyMock.id
      );
      expect(
        reviewConfigService.assignDefaultReviewConfigToCompany
      ).toHaveBeenCalledWith(companyMock._id);
      expect(apiKeyService.regenerateApiKey).toHaveBeenCalledWith(
        companyMock._id.toString()
      );
      expect(pendingRepository.delete).toHaveBeenCalledWith("pendingId");

      createCompanyFromPendingSpy.mockRestore();
      createAdminUserFromPendingSpy.mockRestore();
    });

    it("should throw if pending company not found", async () => {
      pendingRepository.findById.mockResolvedValue(null);

      await expect(
        companyService.activateCompany("pendingId", "subscriptionId")
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw if subscription product is invalid", async () => {
      pendingRepository.findById.mockResolvedValue(pendingMock as any);
      stripeService.getSubscription.mockResolvedValue({
        items: { data: [{ price: {} }] },
      } as any);

      await expect(
        companyService.activateCompany("pendingId", "subscriptionId")
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw if subscription product ID is not a string", async () => {
      pendingRepository.findById.mockResolvedValue(pendingMock as any);
      stripeService.getSubscription.mockResolvedValue({
        items: { data: [{ price: { product: { id: "prod_123" } } }] },
      } as any);

      await expect(
        companyService.activateCompany("pendingId", "subscriptionId")
      ).rejects.toThrow(BadRequestError);
    });

    it("should rollback on activation failure", async () => {
      pendingRepository.findById.mockResolvedValue(pendingMock as any);
      stripeService.getSubscription.mockResolvedValue(subscriptionMock as any);
      stripeService.getProductById.mockResolvedValue(productMock as any);

      // Spy on private methods to throw error
      const createCompanyFromPendingSpy = jest
        .spyOn(companyService as any, "createCompanyFromPending")
        .mockImplementation(() => {
          throw new Error("fail");
        });

      const rollbackSpy = jest.spyOn(
        companyService as any,
        "rollbackActivation"
      );

      // Mocks for rollback internals
      companyRepository.findByStripeCustomerId.mockResolvedValue(
        companyMock as any
      );
      companyRepository.delete.mockResolvedValue(null as any);
      userRepository.findByEmail.mockResolvedValue(adminUserMock as any);
      userRepository.delete.mockResolvedValue(null);
      pendingRepository.delete.mockResolvedValue(null);

      await expect(
        companyService.activateCompany("pendingId", "subscriptionId")
      ).rejects.toThrow(/Activation failed/);

      expect(rollbackSpy).toHaveBeenCalledWith(pendingMock);

      createCompanyFromPendingSpy.mockRestore();
      rollbackSpy.mockRestore();
    });
  });

  describe("ensureCompanyEmailIsUnique", () => {
    it("should throw if company with email exists", async () => {
      companyRepository.findOne.mockResolvedValue({ id: "existing" } as any);
      await expect(
        (companyService as any).ensureCompanyEmailIsUnique("test@example.com")
      ).rejects.toThrow(BadRequestError);
      await expect(
        (companyService as any).ensureCompanyEmailIsUnique("test@example.com")
      ).rejects.toThrow("Company with this email already exists");
    });

    it("should not throw if company email is unique", async () => {
      companyRepository.findOne.mockResolvedValue(null);
      await expect(
        (companyService as any).ensureCompanyEmailIsUnique("unique@example.com")
      ).resolves.not.toThrow();
    });
  });

  describe("ensureNoPendingRegistration", () => {
    it("should throw if pending registration exists", async () => {
      pendingRepository.findOne.mockResolvedValue({ id: "pending" } as any);
      await expect(
        (companyService as any).ensureNoPendingRegistration("test@example.com")
      ).rejects.toThrow(BadRequestError);
      await expect(
        (companyService as any).ensureNoPendingRegistration("test@example.com")
      ).rejects.toThrow("Company registration is already pending.");
    });

    it("should not throw if no pending registration", async () => {
      pendingRepository.findOne.mockResolvedValue(null);
      await expect(
        (companyService as any).ensureNoPendingRegistration(
          "unique@example.com"
        )
      ).resolves.not.toThrow();
    });
  });

  describe("ensureAdminIsUnique", () => {
    it("should throw if user with email exists", async () => {
      userRepository.findByEmail.mockResolvedValue({ id: "user" } as any);
      await expect(
        (companyService as any).ensureAdminIsUnique("admin@example.com")
      ).rejects.toThrow(BadRequestError);
      await expect(
        (companyService as any).ensureAdminIsUnique("admin@example.com")
      ).rejects.toThrow("User with this email is already registered");
    });

    it("should not throw if admin email is unique", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      await expect(
        (companyService as any).ensureAdminIsUnique("uniqueadmin@example.com")
      ).resolves.not.toThrow();
    });
  });

  describe("createStripeCustomer", () => {
    it("should return customer if created", async () => {
      stripeService.createCustomer.mockResolvedValue({
        id: "cus_123",
      } as any);
      const result = await (companyService as any).createStripeCustomer(
        "test@example.com",
        "Test Company"
      );
      expect(result).toEqual({ id: "cus_123" });
      expect(stripeService.createCustomer).toHaveBeenCalledWith(
        "test@example.com",
        "Test Company"
      );
    });

    it("should throw if customer creation fails", async () => {
      stripeService.createCustomer.mockResolvedValue(null as any);
      await expect(
        (companyService as any).createStripeCustomer(
          "test@example.com",
          "Test Co"
        )
      ).rejects.toThrow(BadRequestError);
      await expect(
        (companyService as any).createStripeCustomer(
          "test@example.com",
          "Test Co"
        )
      ).rejects.toThrow("Failed to create Stripe customer");
    });
  });

  describe("createStripeCheckoutSession", () => {
    beforeAll(() => {
      process.env.STRIPE_SUCCESS_URL = "https://success.url";
      process.env.STRIPE_CANCEL_URL = "https://cancel.url";
    });

    it("should return session if created", async () => {
      const fakeSession = { url: "https://checkout.url" };
      stripeService.createCheckoutSession.mockResolvedValue(fakeSession as any);
      const result = await (companyService as any).createStripeCheckoutSession(
        "cus_123",
        "plan_123"
      );
      expect(result).toEqual(fakeSession);
      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer: "cus_123",
          line_items: [{ price: "plan_123", quantity: 1 }],
          success_url: "https://success.url",
          cancel_url: "https://cancel.url",
        })
      );
    });

    it("should throw if session creation fails", async () => {
      stripeService.createCheckoutSession.mockResolvedValue(null as any);
      await expect(
        (companyService as any).createStripeCheckoutSession(
          "cus_123",
          "plan_123"
        )
      ).rejects.toThrow(BadRequestError);
      await expect(
        (companyService as any).createStripeCheckoutSession(
          "cus_123",
          "plan_123"
        )
      ).rejects.toThrow("Failed to create Stripe Checkout session");
    });
  });
});
