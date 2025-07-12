// test/unit/services/company.service.spec.ts
import { CompanyService } from "../../../services/company.service";
import { RegisterCompanyDto } from "../../../dto/company/register.company.dto";
import { BadRequestError, NotFoundError } from "../../../utils/errors";
import { mapRegisterDtoToPendingCompany } from "../../../mappers/company.mapper";
import bcrypt from "bcrypt";
import { StripeService } from "../../../services/stripe.service";
import { CompanyRepository } from "../../../repositories/company.repository";
import { UserRepository } from "../../../repositories/user.repository";
import { PendingCompanyRepository } from "../../../repositories/pending.repository";
import { ReviewConfigService } from "../../../services/review.config.service";
import { ApiKeyService } from "../../../services/key.service";
import { SubscriptionRepository } from "../../../repositories/subscription.repository";
import { logger } from "../../../utils/logger";
import { Types } from "mongoose";
import { compareTiers } from "../../../utils/plan";
import { ISubscriptionDocument } from "../../../models/entities/subscription.entity";
import { ICompanyDocument } from "../../../models/entities/company.entity";

jest.mock("bcrypt");
jest.mock("../../../mappers/company.mapper", () => ({
  mapRegisterDtoToPendingCompany: jest.fn(),
}));
jest.mock("../../../utils/plan", () => ({
  compareTiers: jest.fn(),
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
      getPriceById: jest.fn(),
      releaseSubscriptionSchedule: jest.fn(),
      cancelSubscription: jest.fn(),
      cancelSubscriptionSchedule: jest.fn(),
      updateSubscription: jest.fn(),
      createSubscriptionSchedule: jest.fn(),
      addDowngradePhasesToSchedule: jest.fn(),
    } as any;

    companyRepository = {
      findOne: jest.fn(),
      findByStripeCustomerId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findById: jest.fn(),
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

    subscriptionRepository = {
      findOne: jest.fn(),
      findActiveSubscriptionByStripeCustomerId: jest.fn(),
    } as any;

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

  describe("releaseScheduledSubscriptionBySubscription", () => {
    it("should return early if subscription has no scheduledUpdate", async () => {
      const subscription = { scheduledUpdate: null } as any;
      await expect(
        companyService.releaseScheduledSubscriptionBySubscription(subscription)
      ).resolves.toBeUndefined();
      expect(stripeService.releaseSubscriptionSchedule).not.toHaveBeenCalled();
    });

    it("should call stripeService and succeed if schedule released", async () => {
      const subscription = {
        scheduledUpdate: { scheduleId: "sched_123" },
      } as any;
      stripeService.releaseSubscriptionSchedule.mockResolvedValue({
        status: "released",
      } as any);

      await expect(
        companyService.releaseScheduledSubscriptionBySubscription(subscription)
      ).resolves.toBeUndefined();
      expect(stripeService.releaseSubscriptionSchedule).toHaveBeenCalledWith(
        "sched_123"
      );
    });

    it("should throw if stripeService returns null", async () => {
      const subscription = {
        scheduledUpdate: { scheduleId: "sched_123" },
      } as any;
      stripeService.releaseSubscriptionSchedule.mockResolvedValue(null as any);

      await expect(
        companyService.releaseScheduledSubscriptionBySubscription(subscription)
      ).rejects.toThrow(BadRequestError);
      await expect(
        companyService.releaseScheduledSubscriptionBySubscription(subscription)
      ).rejects.toThrow("Failed to release subscription schedule");
    });

    it("should throw if released schedule status is not 'released'", async () => {
      const subscription = {
        scheduledUpdate: { scheduleId: "sched_123" },
      } as any;
      stripeService.releaseSubscriptionSchedule.mockResolvedValue({
        status: "not_released",
      } as any);

      await expect(
        companyService.releaseScheduledSubscriptionBySubscription(subscription)
      ).rejects.toThrow(BadRequestError);
      await expect(
        companyService.releaseScheduledSubscriptionBySubscription(subscription)
      ).rejects.toThrow("Failed to release subscription schedule");
    });
  });

  describe("releaseScheduledSubscriptionByCompanyId", () => {
    it("should throw if company subscription not found", async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        companyService.releaseScheduledSubscriptionByCompanyId("companyId123")
      ).rejects.toThrow(BadRequestError);
      await expect(
        companyService.releaseScheduledSubscriptionByCompanyId("companyId123")
      ).rejects.toThrow("Company not found");
    });

    it("should throw if subscription has no scheduledUpdate", async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        scheduledUpdate: null,
      } as any);

      await expect(
        companyService.releaseScheduledSubscriptionByCompanyId("companyId123")
      ).rejects.toThrow(BadRequestError);
      await expect(
        companyService.releaseScheduledSubscriptionByCompanyId("companyId123")
      ).rejects.toThrow("No scheduled subscriptions found");
    });

    it("should call stripeService.releaseSubscriptionSchedule and return result", async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        scheduledUpdate: { scheduleId: "sched_123" },
      } as any);

      stripeService.releaseSubscriptionSchedule.mockResolvedValue({
        status: "released",
      } as any);

      const result =
        await companyService.releaseScheduledSubscriptionByCompanyId(
          "companyId123"
        );

      expect(stripeService.releaseSubscriptionSchedule).toHaveBeenCalledWith(
        "sched_123"
      );
      expect(result).toEqual({ status: "released" });
    });
  });

  describe("rollbackActivation", () => {
    it("should delete company and user when both exist", async () => {
      const pending = {
        stripeCustomerId: "cus_123",
        adminEmail: "admin@company.com",
      };
      const company = { id: "comp_1" };
      const user = { id: "user_1" };

      companyRepository.findByStripeCustomerId.mockResolvedValue(
        company as any
      );
      companyRepository.delete.mockResolvedValue(undefined);

      userRepository.findByEmail.mockResolvedValue(user as any);
      userRepository.delete.mockResolvedValue(undefined as any);

      await (companyService as any).rollbackActivation(pending);

      expect(companyRepository.findByStripeCustomerId).toHaveBeenCalledWith(
        "cus_123"
      );
      expect(companyRepository.delete).toHaveBeenCalledWith("comp_1");

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        "admin@company.com"
      );
      expect(userRepository.delete).toHaveBeenCalledWith("user_1");
    });

    it("should skip company deletion if company not found", async () => {
      const pending = {
        stripeCustomerId: "cus_123",
        adminEmail: "admin@company.com",
      };

      companyRepository.findByStripeCustomerId.mockResolvedValue(null);

      userRepository.findByEmail.mockResolvedValue(null);

      await (companyService as any).rollbackActivation(pending);

      expect(companyRepository.delete).not.toHaveBeenCalled();
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it("should handle error gracefully and log it", async () => {
      const pending = {
        stripeCustomerId: "cus_123",
        adminEmail: "admin@company.com",
      };

      companyRepository.findByStripeCustomerId.mockRejectedValue(
        new Error("Company find error")
      );

      // userRepository will throw too
      userRepository.findByEmail.mockRejectedValue(
        new Error("User find error")
      );

      await (companyService as any).rollbackActivation(pending);

      expect(logger.error).toHaveBeenCalledWith(
        "Rollback failed:",
        expect.any(Error)
      );
    });
  });

  describe("cancelScheduledSubscriptionBySubscription", () => {
    it("should return immediately if subscription has no scheduledUpdate", async () => {
      const subscription = { scheduledUpdate: undefined };

      await expect(
        companyService.cancelScheduledSubscriptionBySubscription(
          subscription as any
        )
      ).resolves.toBeUndefined();

      expect(stripeService.cancelSubscriptionSchedule).not.toHaveBeenCalled();
    });

    it("should call stripeService.cancelSubscriptionSchedule with correct scheduleId", async () => {
      const subscription = {
        scheduledUpdate: { scheduleId: "schedule_123" },
      };

      stripeService.cancelSubscriptionSchedule.mockResolvedValue({
        status: "released",
      } as any);

      await companyService.cancelScheduledSubscriptionBySubscription(
        subscription as any
      );

      expect(stripeService.cancelSubscriptionSchedule).toHaveBeenCalledWith(
        "schedule_123"
      );
    });

    it("should throw BadRequestError if stripeService returns null", async () => {
      const subscription = {
        scheduledUpdate: { scheduleId: "schedule_123" },
      };

      stripeService.cancelSubscriptionSchedule.mockResolvedValue(null as any);

      await expect(
        companyService.cancelScheduledSubscriptionBySubscription(
          subscription as any
        )
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if schedule status is not 'released'", async () => {
      const subscription = {
        scheduledUpdate: { scheduleId: "schedule_123" },
      };

      stripeService.cancelSubscriptionSchedule.mockResolvedValue({
        status: "not_released",
      } as any);

      await expect(
        companyService.cancelScheduledSubscriptionBySubscription(
          subscription as any
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("cancelScheduledSubscriptionByCompanyId", () => {
    it("should throw BadRequestError if no subscription found", async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        companyService.cancelScheduledSubscriptionByCompanyId("companyId123")
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if subscription has no scheduledUpdate", async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        scheduledUpdate: undefined,
      } as any);

      await expect(
        companyService.cancelScheduledSubscriptionByCompanyId("companyId123")
      ).rejects.toThrow(BadRequestError);
    });

    it("should call stripeService.cancelSubscriptionSchedule with correct scheduleId and return result", async () => {
      const mockScheduleId = "schedule_abc";

      subscriptionRepository.findOne.mockResolvedValue({
        scheduledUpdate: { scheduleId: mockScheduleId },
      } as any);

      const mockReturnValue = { id: "released_schedule", status: "released" };
      stripeService.cancelSubscriptionSchedule.mockResolvedValue(
        mockReturnValue as any
      );

      const result =
        await companyService.cancelScheduledSubscriptionByCompanyId(
          "companyId123"
        );

      expect(stripeService.cancelSubscriptionSchedule).toHaveBeenCalledWith(
        mockScheduleId
      );
      expect(result).toEqual(mockReturnValue);
    });
  });

  describe("cancelSubscriptions", () => {
    beforeEach(() => {
      jest
        .spyOn(
          companyService,
          "releaseScheduledSubscriptionBySubscription" as any
        )
        .mockResolvedValue(undefined);
    });

    it("should throw BadRequestError if subscription not found", async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        companyService.cancelSubscriptions("companyId123")
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw BadRequestError if stripeService.cancelSubscription fails or missing cancel_at_period_end", async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        stripeSubscriptionId: "sub_123",
      } as any);

      // falsy result
      stripeService.cancelSubscription.mockResolvedValue(null as any);

      await expect(
        companyService.cancelSubscriptions("companyId123")
      ).rejects.toThrow(BadRequestError);

      // missing cancel_at_period_end
      stripeService.cancelSubscription.mockResolvedValue({
        cancel_at_period_end: false,
      } as any);

      await expect(
        companyService.cancelSubscriptions("companyId123")
      ).rejects.toThrow(BadRequestError);
    });

    it("should call releaseScheduledSubscriptionBySubscription if scheduledUpdate exists", async () => {
      const subscription = {
        stripeSubscriptionId: "sub_123",
        scheduledUpdate: {},
      };

      subscriptionRepository.findOne.mockResolvedValue(subscription as any);

      stripeService.cancelSubscription.mockResolvedValue({
        cancel_at_period_end: true,
      } as any);

      const releaseSpy = jest.spyOn(
        companyService,
        "releaseScheduledSubscriptionBySubscription"
      );

      const result = await companyService.cancelSubscriptions("companyId123");

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith(
        "sub_123",
        true
      );
      expect(releaseSpy).toHaveBeenCalledWith(subscription);
      expect(result).toEqual({ cancel_at_period_end: true });
    });

    it("should NOT call releaseScheduledSubscriptionBySubscription if scheduledUpdate does NOT exist", async () => {
      const subscription = {
        stripeSubscriptionId: "sub_123",
        scheduledUpdate: undefined,
      };

      subscriptionRepository.findOne.mockResolvedValue(subscription as any);

      stripeService.cancelSubscription.mockResolvedValue({
        cancel_at_period_end: true,
      } as any);

      const releaseSpy = jest.spyOn(
        companyService,
        "releaseScheduledSubscriptionBySubscription"
      );

      const result = await companyService.cancelSubscriptions("companyId123");

      expect(stripeService.cancelSubscription).toHaveBeenCalledWith(
        "sub_123",
        true
      );
      expect(releaseSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ cancel_at_period_end: true });
    });
  });

  describe("getCompanyById", () => {
    it("should throw BadRequestError for invalid ObjectId", async () => {
      const invalidId = "not-a-valid-id";

      await expect(companyService.getCompanyById(invalidId)).rejects.toThrow(
        BadRequestError
      );
    });

    it("should throw NotFoundError if company is not found", async () => {
      const validId = new Types.ObjectId().toString();
      companyRepository.findById.mockResolvedValue(null);

      await expect(companyService.getCompanyById(validId)).rejects.toThrow(
        NotFoundError
      );
    });

    it("should return company if found", async () => {
      const validId = new Types.ObjectId().toString();
      const mockCompany = {
        _id: validId,
        name: "Mock Company",
        mainEmail: "test@company.com",
      };

      companyRepository.findById.mockResolvedValue(mockCompany as any);

      const result = await companyService.getCompanyById(validId);

      expect(result).toEqual(mockCompany);
      expect(companyRepository.findById).toHaveBeenCalledWith(validId);
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

  describe("handleUpgrade", () => {
    const subscriptionId = "sub_123";
    const newPriceId = "price_456";

    it("should release existing schedule and then upgrade subscription", async () => {
      const subscription = {
        id: subscriptionId,
        schedule: "sched_789",
      };

      stripeService.releaseSubscriptionSchedule.mockResolvedValue({
        status: "released",
      } as any);
      stripeService.updateSubscription.mockResolvedValue({} as any);

      const result = await (companyService as any).handleUpgrade(
        subscription,
        newPriceId
      );

      expect(stripeService.releaseSubscriptionSchedule).toHaveBeenCalledWith(
        "sched_789"
      );
      expect(stripeService.updateSubscription).toHaveBeenCalledWith(
        subscriptionId,
        newPriceId,
        {
          proration_behavior: "create_prorations",
        }
      );
      expect(result).toEqual({
        id: subscriptionId,
        message: "Subscription upgraded successfully",
      });
    });

    it("should upgrade directly if no existing schedule", async () => {
      const subscription = {
        id: subscriptionId,
        schedule: undefined,
      };

      stripeService.updateSubscription.mockResolvedValue({} as any);

      const result = await (companyService as any).handleUpgrade(
        subscription,
        newPriceId
      );

      expect(stripeService.releaseSubscriptionSchedule).not.toHaveBeenCalled();
      expect(stripeService.updateSubscription).toHaveBeenCalledWith(
        subscriptionId,
        newPriceId,
        {
          proration_behavior: "create_prorations",
        }
      );
      expect(result).toEqual({
        id: subscriptionId,
        message: "Subscription upgraded successfully",
      });
    });

    it("should throw if releasing existing schedule fails", async () => {
      const subscription = {
        id: subscriptionId,
        schedule: "sched_789",
      };

      stripeService.releaseSubscriptionSchedule.mockRejectedValue(
        new Error("Stripe error")
      );

      await expect(
        (companyService as any).handleUpgrade(subscription, newPriceId)
      ).rejects.toThrow(BadRequestError);

      expect(stripeService.releaseSubscriptionSchedule).toHaveBeenCalledWith(
        "sched_789"
      );
      expect(stripeService.updateSubscription).not.toHaveBeenCalled();
    });
  });

  describe("handleDowngrade", () => {
    const subscriptionId = "sub_123";
    const newPriceId = "price_456";
    const current_period_start = 1650000000;
    const current_period_end = 1652592000;

    const baseSubscription = {
      id: subscriptionId,
      items: {
        data: [
          {
            current_period_start,
            current_period_end,
          },
        ],
      },
    };

    it("should schedule a downgrade successfully", async () => {
      stripeService.createSubscriptionSchedule.mockResolvedValue({
        id: "sched_123",
      } as any);
      stripeService.addDowngradePhasesToSchedule.mockResolvedValue({
        id: "sched_123",
      } as any);

      const result = await (companyService as any).handleDowngrade(
        baseSubscription,
        newPriceId
      );

      expect(stripeService.createSubscriptionSchedule).toHaveBeenCalledWith({
        from_subscription: subscriptionId,
      });

      expect(stripeService.addDowngradePhasesToSchedule).toHaveBeenCalledWith(
        "sched_123",
        baseSubscription,
        newPriceId,
        current_period_start,
        current_period_end
      );

      expect(result).toEqual({
        message: "Downgrade scheduled successfully",
        scheduleId: "sched_123",
      });
    });

    it("should throw if subscription item is missing", async () => {
      const subscription = { ...baseSubscription, items: { data: [] } };

      await expect(
        (companyService as any).handleDowngrade(subscription, newPriceId)
      ).rejects.toThrow(BadRequestError);

      expect(stripeService.createSubscriptionSchedule).not.toHaveBeenCalled();
    });

    it("should throw if subscription item is missing period dates", async () => {
      const subscription = {
        ...baseSubscription,
        items: {
          data: [
            {
              current_period_start: null,
              current_period_end: null,
            },
          ],
        },
      };

      await expect(
        (companyService as any).handleDowngrade(subscription, newPriceId)
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw if schedule creation fails", async () => {
      stripeService.createSubscriptionSchedule.mockResolvedValue(null as any);

      await expect(
        (companyService as any).handleDowngrade(baseSubscription, newPriceId)
      ).rejects.toThrow("Failed to create subscription schedule");
    });

    it("should throw if adding downgrade phases fails", async () => {
      stripeService.createSubscriptionSchedule.mockResolvedValue({
        id: "sched_123",
      } as any);
      stripeService.addDowngradePhasesToSchedule.mockResolvedValue(null as any);

      await expect(
        (companyService as any).handleDowngrade(baseSubscription, newPriceId)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("getSubscriptionActionOrThrow", () => {
    const currentPrice = {
      metadata: {
        tier: "1",
      },
    };

    const newPrice = {
      metadata: {
        tier: "2",
      },
    };

    it("should throw if tier metadata is missing or invalid", () => {
      const currentPrice = { metadata: {} };
      const newPrice = { metadata: { tier: "2" } };

      expect(() => {
        (companyService as any).getSubscriptionActionOrThrow(
          currentPrice,
          newPrice
        );
      }).toThrow("Invalid tier metadata on subscription prices");
    });

    it("should return the action from compareTiers", () => {
      (compareTiers as jest.Mock).mockReturnValue("upgrade");

      const result = (companyService as any).getSubscriptionActionOrThrow(
        currentPrice,
        newPrice
      );

      expect(compareTiers).toHaveBeenCalledWith(1, 2);
      expect(result).toBe("upgrade");
    });

    it("should handle 'same' tier case", () => {
      (compareTiers as jest.Mock).mockReturnValue("same");

      const result = (companyService as any).getSubscriptionActionOrThrow(
        currentPrice,
        newPrice
      );

      expect(compareTiers).toHaveBeenCalledWith(1, 2);
      expect(result).toBe("same");
    });

    it("should handle 'downgrade' case", () => {
      (compareTiers as jest.Mock).mockReturnValue("downgrade");

      const result = (companyService as any).getSubscriptionActionOrThrow(
        currentPrice,
        newPrice
      );

      expect(compareTiers).toHaveBeenCalledWith(1, 2);
      expect(result).toBe("downgrade");
    });

    it("should throw if tier metadata is missing or invalid", () => {
      const brokenPrice = { metadata: {} };

      expect(() => {
        (companyService as any).getSubscriptionActionOrThrow(
          brokenPrice,
          brokenPrice
        );
      }).toThrow("Invalid tier metadata on subscription prices");
    });
  });

  describe("getProductsOrThrow", () => {
    const currentPrice = { product: "prod_1" };
    const newPrice = { product: "prod_2" };

    const currentProduct = {
      id: "prod_1",
      metadata: { tier: "1" },
    };

    const newProduct = {
      id: "prod_2",
      metadata: { tier: "2" },
    };

    it("should return current and new products if valid", async () => {
      stripeService.getProductById
        .mockResolvedValueOnce(currentProduct as any)
        .mockResolvedValueOnce(newProduct as any);

      const result = await (companyService as any).getProductsOrThrow(
        currentPrice,
        newPrice
      );

      expect(stripeService.getProductById).toHaveBeenCalledWith("prod_1");
      expect(stripeService.getProductById).toHaveBeenCalledWith("prod_2");
      expect(result).toEqual([currentProduct, newProduct]);
    });

    it("should throw if currentProductId is missing", async () => {
      await expect(
        (companyService as any).getProductsOrThrow({}, newPrice)
      ).rejects.toThrow("Current product ID missing");
    });

    it("should throw if newProductId is missing", async () => {
      await expect(
        (companyService as any).getProductsOrThrow(currentPrice, {})
      ).rejects.toThrow("New product ID missing");
    });

    it("should throw if currentProduct not found", async () => {
      stripeService.getProductById
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(newProduct as any);

      await expect(
        (companyService as any).getProductsOrThrow(currentPrice, newPrice)
      ).rejects.toThrow("Current product not found");
    });

    it("should throw if newProduct not found", async () => {
      stripeService.getProductById
        .mockResolvedValueOnce(currentProduct as any)
        .mockResolvedValueOnce(null as any);

      await expect(
        (companyService as any).getProductsOrThrow(currentPrice, newPrice)
      ).rejects.toThrow("New product not found");
    });
  });
  describe("getPricesOrThrow", () => {
    const currentPriceId = "price_123";
    const newPriceId = "price_456";

    const currentPrice = { id: currentPriceId, product: "prod_1" };
    const newPrice = { id: newPriceId, product: "prod_2" };

    it("should return both prices when found", async () => {
      stripeService.getPriceById
        .mockResolvedValueOnce(currentPrice as any)
        .mockResolvedValueOnce(newPrice as any);

      const result = await (companyService as any).getPricesOrThrow(
        currentPriceId,
        newPriceId
      );

      expect(stripeService.getPriceById).toHaveBeenCalledWith(currentPriceId);
      expect(stripeService.getPriceById).toHaveBeenCalledWith(newPriceId);
      expect(result).toEqual([currentPrice, newPrice]);
    });

    it("should throw if current price not found", async () => {
      stripeService.getPriceById
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(newPrice as any);

      await expect(
        (companyService as any).getPricesOrThrow(currentPriceId, newPriceId)
      ).rejects.toThrow("Current price not found");
    });

    it("should throw if new price not found", async () => {
      stripeService.getPriceById
        .mockResolvedValueOnce(currentPrice as any)
        .mockResolvedValueOnce(null as any);

      await expect(
        (companyService as any).getPricesOrThrow(currentPriceId, newPriceId)
      ).rejects.toThrow("New price not found");
    });
  });

  describe("ensureNewPriceIdIsValid", () => {
    it("should not throw if newPriceId is valid", () => {
      const method = (companyService as any).ensureNewPriceIdIsValid.bind(
        companyService
      );
      expect(() => method("price_123")).not.toThrow();
    });

    it("should throw BadRequestError if newPriceId is an empty string", () => {
      const method = (companyService as any).ensureNewPriceIdIsValid.bind(
        companyService
      );
      expect(() => method("")).toThrow("New price ID missing");
    });

    it("should throw BadRequestError if newPriceId is null", () => {
      const method = (companyService as any).ensureNewPriceIdIsValid.bind(
        companyService
      );
      expect(() => method(null)).toThrow("New price ID missing");
    });

    it("should throw BadRequestError if newPriceId is undefined", () => {
      const method = (companyService as any).ensureNewPriceIdIsValid.bind(
        companyService
      );
      expect(() => method(undefined)).toThrow("New price ID missing");
    });
  });

  describe("extractCurrentPriceIdOrThrow", () => {
    let method: (subscription: any) => string;

    beforeEach(() => {
      method = (companyService as any).extractCurrentPriceIdOrThrow.bind(
        companyService
      );
    });

    it("should return the price ID if present", () => {
      const subscription = {
        items: {
          data: [
            {
              price: {
                id: "price_123",
              },
            },
          ],
        },
      };

      const result = method(subscription);
      expect(result).toBe("price_123");
    });

    it("should throw BadRequestError if price ID is missing", () => {
      const subscriptionMissingId = {
        items: {
          data: [
            {
              price: {},
            },
          ],
        },
      };

      expect(() => method(subscriptionMissingId)).toThrow(
        "Current price ID missing"
      );
    });

    it("should throw BadRequestError if items array is empty", () => {
      const subscriptionEmptyItems = {
        items: {
          data: [],
        },
      };

      expect(() => method(subscriptionEmptyItems)).toThrow(
        "Current price ID missing"
      );
    });

    it("should throw BadRequestError if items is undefined", () => {
      const subscriptionNoItems = {};

      expect(() => method(subscriptionNoItems)).toThrow(
        "Current price ID missing"
      );
    });
  });

  describe("getStripeSubscriptionOrThrow", () => {
    let method: (subscription: ISubscriptionDocument) => Promise<any>;

    beforeEach(() => {
      method = (companyService as any).getStripeSubscriptionOrThrow.bind(
        companyService
      );
    });

    it("should throw BadRequestError if stripe subscription is null", async () => {
      stripeService.getSubscription.mockResolvedValue(null as any);

      await expect(
        method({ stripeSubscriptionId: "sub_123" } as any)
      ).rejects.toThrow("No active subscription found");
    });

    it("should return stripe subscription if found", async () => {
      const stripeSub = { id: "sub_123" };
      stripeService.getSubscription.mockResolvedValue(stripeSub as any);

      const result = await method({ stripeSubscriptionId: "sub_123" } as any);
      expect(result).toBe(stripeSub);
    });
  });

  describe("getActiveSubscriptionOrThrow", () => {
    let method: (company: ICompanyDocument) => Promise<any>;

    beforeEach(() => {
      method = (companyService as any).getActiveSubscriptionOrThrow.bind(
        companyService
      );
    });

    it("should throw BadRequestError if no active subscription found", async () => {
      subscriptionRepository.findActiveSubscriptionByStripeCustomerId.mockResolvedValue(
        null
      );

      const company = { stripeCustomerId: "cus_123" } as any;

      await expect(method(company)).rejects.toThrow(
        "Company has no active subscription"
      );
    });

    it("should return active subscription if found", async () => {
      const activeSubscription = { id: "sub_123" };
      subscriptionRepository.findActiveSubscriptionByStripeCustomerId.mockResolvedValue(
        activeSubscription as any
      );

      const company = { stripeCustomerId: "cus_123" } as any;

      const result = await method(company);
      expect(result).toBe(activeSubscription);
    });
  });

  describe("getCompanyOrThrow", () => {
    let method: (companyId: string) => Promise<any>;

    beforeEach(() => {
      method = (companyService as any).getCompanyOrThrow.bind(companyService);
    });

    it("should throw BadRequestError if company not found", async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(method("companyId123")).rejects.toThrow("Company not found");
    });

    it("should return company if found", async () => {
      const company = { id: "companyId123", name: "TestCo" };
      companyRepository.findById.mockResolvedValue(company as any);

      const result = await method("companyId123");
      expect(result).toBe(company);
    });
  });

  describe("updateSubscription", () => {
    const companyId = "companyId123";
    const newPriceId = "newPriceId123";

    let company = { stripeCustomerId: "cus_123" };
    let activeSubscription = { stripeSubscriptionId: "sub_123" };
    let stripeSubscription = {
      id: "sub_123",
      items: {
        data: [
          {
            price: { id: "price_123" },
            current_period_start: 1,
            current_period_end: 2,
          },
        ],
      },
      schedule: null,
    };

    beforeEach(() => {
      // Mock the internal private methods
      jest
        .spyOn(companyService as any, "getCompanyOrThrow")
        .mockResolvedValue(company);
      jest
        .spyOn(companyService as any, "getActiveSubscriptionOrThrow")
        .mockResolvedValue(activeSubscription);
      jest
        .spyOn(companyService as any, "getStripeSubscriptionOrThrow")
        .mockResolvedValue(stripeSubscription);
      jest
        .spyOn(companyService as any, "extractCurrentPriceIdOrThrow")
        .mockReturnValue("price_123");
      jest
        .spyOn(companyService as any, "ensureNewPriceIdIsValid")
        .mockImplementation(() => {});
      jest.spyOn(companyService as any, "getPricesOrThrow").mockResolvedValue([
        { product: "prod_123" }, // currentPrice
        { product: "prod_456" }, // newPrice
      ]);
      jest
        .spyOn(companyService as any, "getProductsOrThrow")
        .mockResolvedValue([
          { metadata: { tier: "1" } }, // currentProduct
          { metadata: { tier: "2" } }, // newProduct
        ]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should throw if subscription action is 'same'", async () => {
      jest
        .spyOn(companyService as any, "getSubscriptionActionOrThrow")
        .mockReturnValue("same");

      await expect(
        companyService.updateSubscription(companyId, newPriceId)
      ).rejects.toThrow("Already in the same tier");
    });

    it("should call handleDowngrade if action is 'downgrade'", async () => {
      jest
        .spyOn(companyService as any, "getSubscriptionActionOrThrow")
        .mockReturnValue("downgrade");
      const handleDowngradeSpy = jest
        .spyOn(companyService as any, "handleDowngrade")
        .mockResolvedValue("downgrade result");

      const result = await companyService.updateSubscription(
        companyId,
        newPriceId
      );

      expect(handleDowngradeSpy).toHaveBeenCalledWith(
        stripeSubscription,
        newPriceId
      );
      expect(result).toBe("downgrade result");
    });

    it("should call handleUpgrade if action is 'upgrade'", async () => {
      jest
        .spyOn(companyService as any, "getSubscriptionActionOrThrow")
        .mockReturnValue("upgrade");
      const handleUpgradeSpy = jest
        .spyOn(companyService as any, "handleUpgrade")
        .mockResolvedValue("upgrade result");

      const result = await companyService.updateSubscription(
        companyId,
        newPriceId
      );

      expect(handleUpgradeSpy).toHaveBeenCalledWith(
        stripeSubscription,
        newPriceId
      );
      expect(result).toBe("upgrade result");
    });

    it("should throw error on unknown subscription action", async () => {
      jest
        .spyOn(companyService as any, "getSubscriptionActionOrThrow")
        .mockReturnValue("unexpected_action");

      await expect(
        companyService.updateSubscription(companyId, newPriceId)
      ).rejects.toThrow("Unknown subscription action");
    });
  });
});
