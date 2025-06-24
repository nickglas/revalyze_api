import { StripeWebhookService } from "../../services/webhook.service";
import { StripeService } from "../../services/stripe.service";
import { CompanyRepository } from "../../repositories/company.repository";
import { PlanRepository } from "../../repositories/plan.repository";
import Stripe from "stripe";
import { ICompany } from "../../models/company.model";
import Subscription from "../../models/subscription.model";
import pendingCompanyModel from "../../models/pendingCompany.model";
import userModel from "../../models/user.model";
import { NotFoundError } from "../../utils/errors";
import mongoose from "mongoose";

// Mock all dependencies with proper implementations
jest.mock("../../services/stripe.service", () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    getProductById: jest.fn(),
    getPricesForProduct: jest.fn(),
    getSubscription: jest.fn(),
    getSubscriptionScheduleById: jest.fn(),
    getPriceById: jest.fn(),
  })),
}));

jest.mock("../../repositories/company.repository", () => ({
  CompanyRepository: jest.fn().mockImplementation(() => ({
    findOne: jest.fn(),
    create: jest.fn(),
  })),
}));

jest.mock("../../repositories/plan.repository", () => ({
  PlanRepository: jest.fn().mockImplementation(() => ({
    findByStripeProductId: jest.fn(),
    deleteByStripeProductId: jest.fn(),
    upsert: jest.fn(),
  })),
}));

jest.mock("../../models/company.model", () => ({}));
jest.mock("../../models/subscription.model", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../../models/pendingCompany.model", () => ({
  findOne: jest.fn(),
}));
jest.mock("../../models/user.model", () => ({
  create: jest.fn(),
}));

describe("StripeWebhookService", () => {
  let service: StripeWebhookService;
  let stripeService: jest.Mocked<StripeService>;
  let companyRepo: jest.Mocked<CompanyRepository>;
  let planRepo: jest.Mocked<PlanRepository>;

  // Create a reusable mock subscription
  const createMockSubscription = (overrides = {}) => ({
    save: jest.fn().mockResolvedValue(undefined),
    scheduledUpdate: undefined,
    ...overrides,
  });

  // Create a mock company with all required properties
  const createMockCompany = (overrides = {}) =>
    ({
      _id: new mongoose.Types.ObjectId(),
      name: "TestCo",
      mainEmail: "test@testco.com",
      stripeCustomerId: "cust_123",
      stripeSubscriptionId: "sub_123",
      isActive: true,
      allowedUsers: 0,
      allowedTranscripts: 0,
      save: jest.fn().mockResolvedValue(this),
      toJSON: () => ({
        _id: "comp_123",
        name: "TestCo",
        mainEmail: "test@testco.com",
        stripeCustomerId: "cust_123",
        stripeSubscriptionId: "sub_123",
        isActive: true,
        allowedUsers: 0,
        allowedTranscripts: 0,
      }),
      ...overrides,
    } as unknown as mongoose.Document<any, any, ICompany> &
      ICompany & { _id: mongoose.Types.ObjectId });

  beforeEach(() => {
    // Initialize mocks with proper typing
    stripeService = new StripeService() as jest.Mocked<StripeService>;
    companyRepo = new CompanyRepository() as jest.Mocked<CompanyRepository>;
    planRepo = new PlanRepository() as jest.Mocked<PlanRepository>;

    service = new StripeWebhookService(stripeService, companyRepo, planRepo);

    // Configure fake timers
    jest.useFakeTimers();
    // Silence console output during tests
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    // Restore real timers
    jest.useRealTimers();
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("processStripeEvent", () => {
    it("should route events to correct handlers", async () => {
      // Spy on all handler methods
      const handlers = [
        "handleProductEvent",
        "handleProductDeleted",
        "handlePriceEvent",
        "handleSubscriptionEvent",
        "handleScheduleChange",
        "handleCheckoutCompleted",
      ];

      handlers.forEach((handler) => {
        jest.spyOn(service as any, handler).mockResolvedValue(undefined);
      });

      const events = [
        "product.created",
        "product.updated",
        "product.deleted",
        "price.created",
        "price.updated",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "subscription_schedule.created",
        "subscription_schedule.updated",
        "subscription_schedule.completed",
        "checkout.session.completed",
      ];

      // Process each event type
      for (const eventType of events) {
        await service.processStripeEvent({ type: eventType } as Stripe.Event);
      }

      // Verify correct handlers were called
      expect(service["handleProductEvent"]).toHaveBeenCalledTimes(2);
      expect(service["handleProductDeleted"]).toHaveBeenCalledTimes(1);
      expect(service["handlePriceEvent"]).toHaveBeenCalledTimes(2);
      expect(service["handleSubscriptionEvent"]).toHaveBeenCalledTimes(3);
      expect(service["handleScheduleChange"]).toHaveBeenCalledTimes(3);
      expect(service["handleCheckoutCompleted"]).toHaveBeenCalledTimes(1);
    });
  });

  // describe("handleProductDeleted", () => {
  //   it("should delete plan when product is deleted", async () => {
  //     const event = {
  //       data: { object: { id: "prod_123" } },
  //     } as Stripe.Event;

  //     // Mock plan repository methods
  //     planRepo.findByStripeProductId.mockResolvedValue({} as any);
  //     planRepo.deleteByStripeProductId.mockResolvedValue({} as any);

  //     await service["handleProductDeleted"](event);

  //     // Verify correct calls were made
  //     expect(planRepo.findByStripeProductId).toHaveBeenCalledWith("prod_123");
  //     expect(planRepo.deleteByStripeProductId).toHaveBeenCalledWith("prod_123");
  //   });

  //   it("should throw NotFoundError when plan not found", async () => {
  //     const event = {
  //       data: { object: { id: "prod_123" } },
  //     } as Stripe.Event;

  //     // Simulate plan not found
  //     planRepo.findByStripeProductId.mockRejectedValue(new NotFoundError(""));

  //     // Verify error is thrown
  //     await expect(service["handleProductDeleted"](event)).rejects.toThrow(
  //       NotFoundError
  //     );
  //   });
  // });

  // describe("handlePriceEvent", () => {
  //   it("should simulate product.updated event", async () => {
  //     const event = {
  //       data: {
  //         object: {
  //           id: "price_123",
  //           product: "prod_123",
  //         },
  //       },
  //     } as Stripe.Event;

  //     // Mock Stripe service responses
  //     stripeService.getProductById.mockResolvedValue({} as any);
  //     // Spy on the product handler
  //     const handleProductSpy = jest.spyOn(service as any, "handleProductEvent");

  //     await service["handlePriceEvent"](event);

  //     // Verify correct calls were made
  //     expect(stripeService.getProductById).toHaveBeenCalledWith("prod_123");
  //     expect(handleProductSpy).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         type: "product.updated",
  //         data: { object: {} },
  //       })
  //     );
  //   });
  // });

  // describe("handleSubscriptionEvent", () => {
  //   // Create a reusable subscription event
  //   const createSubscriptionEvent = (overrides = {}) =>
  //     ({
  //       data: {
  //         object: {
  //           id: "sub_123",
  //           customer: "cust_123",
  //           status: "active",
  //           items: {
  //             data: [
  //               {
  //                 price: {
  //                   id: "price_123",
  //                   product: "prod_123",
  //                   unit_amount: 1000,
  //                   currency: "usd",
  //                   recurring: { interval: "month" },
  //                 },
  //               },
  //             ],
  //           },
  //           current_period_start: Date.now() / 1000,
  //           current_period_end: Date.now() / 1000 + 2592000, // 30 days later
  //           cancel_at: null,
  //           canceled_at: null,
  //           cancel_at_period_end: false,
  //           schedule: "sched_123",
  //           ...overrides,
  //         },
  //       },
  //     } as unknown as Stripe.Event);

  //   it("should update company and subscription", async () => {
  //     const event = createSubscriptionEvent();
  //     const mockCompany = createMockCompany({
  //       allowedUsers: 0,
  //       allowedTranscripts: 0,
  //     });

  //     const mockProduct = {
  //       metadata: {
  //         allowedUsers: "5",
  //         allowedTranscripts: "100",
  //         tier: "2",
  //       },
  //     };

  //     // Mock repository responses
  //     companyRepo.findOne.mockResolvedValue(mockCompany as any);
  //     stripeService.getProductById.mockResolvedValue(mockProduct as any);
  //     (Subscription.findOne as jest.Mock).mockResolvedValue(
  //       createMockSubscription()
  //     );
  //     (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue({});

  //     await service["handleSubscriptionEvent"](event);

  //     // Verify company was updated
  //     expect(mockCompany.allowedUsers).toBe(5);
  //     expect(mockCompany.allowedTranscripts).toBe(100);
  //     expect(mockCompany.save).toHaveBeenCalled();

  //     // Verify subscription was updated
  //     expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
  //       { companyId: mockCompany._id },
  //       expect.objectContaining({
  //         allowedUsers: 5,
  //         allowedTranscripts: 100,
  //         tier: 2,
  //       }),
  //       { upsert: true, new: true }
  //     );
  //   });

  //   it("should clear scheduledUpdate when downgrade takes effect", async () => {
  //     const event = createSubscriptionEvent();
  //     const mockCompany = createMockCompany();

  //     const mockSchedule = {
  //       phases: [
  //         {
  //           start_date: Date.now() / 1000 - 1000, // In the past
  //         },
  //       ],
  //     };

  //     const mockLocalSub = createMockSubscription({
  //       scheduledUpdate: {
  //         priceId: "price_123",
  //       },
  //     });

  //     // Mock repository responses
  //     companyRepo.findOne.mockResolvedValue(mockCompany as any);
  //     stripeService.getProductById.mockResolvedValue({} as any);
  //     stripeService.getSubscriptionScheduleById.mockResolvedValue(
  //       mockSchedule as any
  //     );
  //     (Subscription.findOne as jest.Mock).mockResolvedValue(mockLocalSub);
  //     (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue({});

  //     await service["handleSubscriptionEvent"](event);

  //     // Verify scheduled update was cleared
  //     expect(mockLocalSub.scheduledUpdate).toBeUndefined();
  //     expect(mockLocalSub.save).toHaveBeenCalled();
  //   });

  //   it("should retry when company not found", async () => {
  //     const event = createSubscriptionEvent();

  //     // Mock repository to return null twice then a company
  //     companyRepo.findOne
  //       .mockResolvedValueOnce(null)
  //       .mockResolvedValueOnce(null)
  //       .mockResolvedValue(createMockCompany() as any);

  //     // Start processing
  //     const processPromise = service["handleSubscriptionEvent"](event);

  //     // Advance timers to simulate waits
  //     jest.advanceTimersByTime(5000);
  //     jest.advanceTimersByTime(5000);

  //     // Wait for processing to complete
  //     await processPromise;

  //     // Verify retries happened
  //     expect(companyRepo.findOne).toHaveBeenCalledTimes(3);
  //   });
  // });

  // describe("handleCheckoutCompleted", () => {
  //   const createCheckoutEvent = (overrides = {}) =>
  //     ({
  //       data: {
  //         object: {
  //           id: "sess_123",
  //           customer: "cust_123",
  //           subscription: "sub_123",
  //           ...overrides,
  //         },
  //       },
  //     } as Stripe.Event);

  //   it("should create company and admin", async () => {
  //     const event = createCheckoutEvent();
  //     const mockPending = {
  //       companyName: "TestCo",
  //       companyMainEmail: "test@testco.com",
  //       companyPhone: "1234567890",
  //       address: "123 Main St",
  //       adminName: "Admin",
  //       adminEmail: "admin@testco.com",
  //       password: "password",
  //       deleteOne: jest.fn().mockResolvedValue(true),
  //     };

  //     const mockSubscription = {
  //       items: {
  //         data: [
  //           {
  //             price: {
  //               id: "price_123",
  //               product: "prod_123",
  //             },
  //           },
  //         ],
  //       },
  //     };

  //     const mockProduct = {
  //       metadata: {
  //         allowedUsers: "5",
  //         allowedTranscripts: "100",
  //       },
  //     };

  //     const mockCompany = createMockCompany({
  //       allowedUsers: 5,
  //       allowedTranscripts: 100,
  //     });

  //     // Mock repository responses
  //     (pendingCompanyModel.findOne as jest.Mock).mockResolvedValue(mockPending);
  //     stripeService.getSubscription.mockResolvedValue(mockSubscription as any);
  //     stripeService.getProductById.mockResolvedValue(mockProduct as any);
  //     companyRepo.create.mockResolvedValue(mockCompany as any);
  //     (userModel.create as jest.Mock).mockResolvedValue({});

  //     await service["handleCheckoutCompleted"](event);

  //     // Verify company creation
  //     expect(companyRepo.create).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         name: "TestCo",
  //         stripeCustomerId: "cust_123",
  //         allowedUsers: 5,
  //         allowedTranscripts: 100,
  //       })
  //     );

  //     // Verify admin creation
  //     expect(userModel.create).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         companyId: mockCompany._id,
  //         role: "company_admin",
  //       })
  //     );

  //     // Verify pending company cleanup
  //     expect(mockPending.deleteOne).toHaveBeenCalled();
  //   });

  //   it("should warn when pending company not found", async () => {
  //     const event = createCheckoutEvent();

  //     // Simulate no pending company
  //     (pendingCompanyModel.findOne as jest.Mock).mockResolvedValue(null);

  //     await service["handleCheckoutCompleted"](event);

  //     // Verify warning was logged
  //     expect(console.warn).toHaveBeenCalledWith(
  //       expect.stringContaining("No pending company registration")
  //     );
  //   });
  // });

  // describe("handleScheduleChange", () => {
  //   const createScheduleEvent = (overrides = {}) =>
  //     ({
  //       data: {
  //         object: {
  //           id: "sched_123",
  //           subscription: "sub_123",
  //           phases: [
  //             {
  //               start_date: Date.now() / 1000 + 10000, // Future date
  //               items: [{ price: "price_123" }],
  //             },
  //           ],
  //           ...overrides,
  //         },
  //       },
  //     } as Stripe.Event);

  //   it("should update subscription with schedule", async () => {
  //     const event = createScheduleEvent();
  //     const mockSubscription = createMockSubscription({
  //       _id: "sub_123",
  //       companyId: "comp_123",
  //     });

  //     const mockPrice = {
  //       id: "price_123",
  //       product: "prod_123",
  //       unit_amount: 2000,
  //       recurring: { interval: "year" },
  //     };

  //     const mockProduct = {
  //       id: "prod_123",
  //       name: "Premium Plan",
  //       metadata: {
  //         allowedUsers: "10",
  //         allowedTranscripts: "200",
  //         tier: "3",
  //       },
  //     };

  //     // Mock repository responses
  //     (Subscription.findOne as jest.Mock)
  //       .mockResolvedValueOnce(null)
  //       .mockResolvedValueOnce(null)
  //       .mockResolvedValue(mockSubscription);

  //     stripeService.getPriceById.mockResolvedValue(mockPrice as any);
  //     stripeService.getProductById.mockResolvedValue(mockProduct as any);

  //     await service["handleScheduleChange"](event);

  //     // Verify scheduled update was set
  //     expect(mockSubscription.scheduledUpdate).toEqual({
  //       effectiveDate: expect.any(Date),
  //       priceId: "price_123",
  //       productName: "Premium Plan",
  //       productId: "prod_123",
  //       amount: 2000,
  //       interval: "year",
  //       allowedUsers: 10,
  //       allowedTranscripts: 200,
  //       tier: 3,
  //       scheduleId: "sched_123",
  //     });

  //     // Verify subscription was saved
  //     expect(mockSubscription.save).toHaveBeenCalled();
  //   });

  //   it("should clear schedule when no upcoming phases", async () => {
  //     const event = createScheduleEvent({
  //       phases: [], // No upcoming phases
  //     });

  //     const mockSubscription = createMockSubscription({
  //       scheduledUpdate: { some: "data" },
  //     });

  //     // Mock repository response
  //     (Subscription.findOne as jest.Mock).mockResolvedValue(mockSubscription);

  //     await service["handleScheduleChange"](event);

  //     // Verify scheduled update was cleared
  //     expect(mockSubscription.scheduledUpdate).toBeUndefined();
  //     expect(mockSubscription.save).toHaveBeenCalled();
  //   });
  // });
});
