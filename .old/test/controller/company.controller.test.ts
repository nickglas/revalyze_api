jest.mock("../../services/company.service");
jest.mock("../../services/stripe.service");
jest.mock("../../services/company.service");

import request from "supertest";
import app from "../../app";
import Company from "../../models/company.model";
import User from "../../models/user.model";
import refreshTokenModel from "../../models/refreshToken.model";
import bcrypt from "bcryptjs";
import PendingCompanyRegistration from "../../models/pendingCompany.model";
import { StripeService } from "../../services/stripe.service";
import { CompanyService } from "../../services/company.service";
import "reflect-metadata";

import { Container } from "typedi";
import { BadRequestError } from "../../utils/errors";
import { CompanyRepository } from "../../repositories/company.repository";
import { UserRepository } from "../../repositories/user.repository";
import { TranscriptRepository } from "../../repositories/transcript.repository";
import { PendingCompanyRepository } from "../../repositories/pending.repository";
import Subscription from "../../models/subscription.model";
import { SubscriptionRepository } from "../../repositories/subscription.repository";
import { ApiKeyService } from "../../services/key.service";
import { ReviewConfigService } from "../../services/review.config.service";

jest.mock("../../services/stripe.service");
jest.mock("../../utils/plan");

describe("Company Controller", () => {
  let accessToken: string;
  let nonAdminAccessToken: string;
  let companyId: string;
  let mockCompanyService: jest.Mocked<CompanyService>;
  let mockStripeService: jest.Mocked<StripeService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    await Subscription.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
    await refreshTokenModel.deleteMany({});
    await PendingCompanyRegistration.deleteMany({});

    mockStripeService = new StripeService() as jest.Mocked<StripeService>;
    mockStripeService.cancelSubscriptionSchedule = jest.fn();
    mockStripeService.cancelSubscription = jest.fn();
    const mockCompanyRepository = {} as CompanyRepository;
    const mockUserRepository = {} as UserRepository;
    const mockReviewConfigService = {} as ReviewConfigService;
    const mockPendingRepository = {} as PendingCompanyRepository;
    const mockSubscriptionRepository = {} as SubscriptionRepository;
    const mockApiKeyService = {} as ApiKeyService;

    mockCompanyService = new CompanyService(
      mockStripeService,
      mockCompanyRepository,
      mockUserRepository,
      mockPendingRepository,
      mockReviewConfigService,
      mockApiKeyService,
      mockSubscriptionRepository
    ) as jest.Mocked<CompanyService>;

    Container.set(StripeService, mockStripeService);
    Container.set(CompanyService, mockCompanyService);

    const company = await new Company({
      name: "Revalyze",
      mainEmail: "nickglas@revalyze.io",
      subscriptionPlanId: "plan_pro",
      stripeSubscriptionId: "SomeStripeId",
      stripeCustomerId: "SomeStripeId",
      hashedApiKey: "somehashedvalue",
      apiKeyCreatedAt: Date.now(),
    }).save();

    companyId = company.id;

    // Create admin user
    const adminUser = await new User({
      email: "admin@revalyze.io",
      password: await bcrypt.hash("password123", 10),
      role: "company_admin",
      name: "Admin",
      companyId: company.id,
      isActive: true,
    }).save();

    // Create non-admin user
    const nonAdminUser = await new User({
      email: "user@revalyze.io",
      password: await bcrypt.hash("password123", 10),
      role: "employee",
      name: "Regular User",
      companyId: company.id,
      isActive: true,
    }).save();

    // Login as admin
    const adminLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminUser.email, password: "password123" });
    accessToken = adminLoginRes.body.accessToken;

    // Login as non-admin
    const userLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: nonAdminUser.email, password: "password123" });
    nonAdminAccessToken = userLoginRes.body.accessToken;
  });

  describe("Authentication and Authorization", () => {
    const testCases = [
      {
        method: "GET",
        path: "/api/v1/companies",
        requiredRole: null,
        description: "should be accessible to any authenticated user",
      },
      {
        method: "PATCH",
        path: "/api/v1/companies/subscriptions",
        requiredRole: "company_admin",
        description: "should require company_admin role",
      },
      {
        method: "DELETE",
        path: "/api/v1/companies/subscriptions/cancel-active-subscription",
        requiredRole: "company_admin",
        description: "should require company_admin role",
      },
      {
        method: "DELETE",
        path: "/api/v1/companies/subscriptions/scheduled",
        requiredRole: "company_admin",
        description: "should require company_admin role",
      },
      {
        method: "PATCH",
        path: "/api/v1/companies",
        requiredRole: "company_admin",
        description: "should require company_admin role",
      },
    ];

    testCases.forEach(({ method, path, requiredRole, description }) => {
      describe(`${method} ${path}`, () => {
        const testRequest = () => {
          switch (method) {
            case "GET":
              return request(app).get(path);
            case "PATCH":
              return request(app).patch(path).send({});
            case "DELETE":
              return request(app).delete(path);
            default:
              return request(app).get(path);
          }
        };

        it("should return 401 when no token is provided", async () => {
          const res = await testRequest();
          expect(res.status).toBe(401);
          expect(res.body.message).toMatch(/token/i);
        });

        it("should return 401 when invalid token is provided", async () => {
          const res = await testRequest().set(
            "Authorization",
            "Bearer invalid_token"
          );
          expect(res.status).toBe(401);
          expect(res.body.message).toMatch(/invalid token/i);
        });

        if (requiredRole) {
          it(`should return 403 when user doesn't have ${requiredRole} role`, async () => {
            const res = await testRequest().set(
              "Authorization",
              `Bearer ${nonAdminAccessToken}`
            );
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/insufficient permissions/i);
          });
        }

        it(description, async () => {
          // Mock successful service response
          if (method === "GET") {
            mockCompanyService.getCompanyById.mockResolvedValue({
              name: "Test Company",
            } as any);
          } else if (method === "PATCH" && path === "/api/v1/companies") {
            mockCompanyService.updateCompanyById.mockResolvedValue({
              name: "Updated Company",
            } as any);
          } else if (method === "PATCH" && path.includes("subscriptions")) {
            mockCompanyService.updateSubscription.mockResolvedValue({
              message: "Success",
            } as any);
          } else if (method === "DELETE") {
            mockCompanyService.cancelSubscriptions.mockResolvedValue({} as any);
          }

          const token = requiredRole ? accessToken : nonAdminAccessToken;
          const res = await testRequest().set(
            "Authorization",
            `Bearer ${token}`
          );

          expect([200, 400, 500]).toContain(res.status);
          expect(res.status).not.toBe(401);
          expect(res.status).not.toBe(403);
        });
      });
    });
  });

  describe("PATCH /api/v1/companies/subscriptions", () => {
    const url = "/api/v1/companies/subscriptions";

    beforeEach(async () => {
      jest.clearAllMocks();
      await Company.deleteMany({});
      await User.deleteMany({});

      mockCompanyService = new CompanyService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      ) as jest.Mocked<CompanyService>;
      Container.set(CompanyService, mockCompanyService);

      const company = await new Company({
        name: "Revalyze",
        mainEmail: "nickglas@revalyze.io",
        subscriptionPlanId: "plan_pro",
        stripeSubscriptionId: "SomeStripeId",
        stripeCustomerId: "SomeStripeId",
        hashedApiKey: "somehashedvalue",
        apiKeyCreatedAt: Date.now(),
      }).save();
      companyId = company.id;

      const user = await new User({
        email: "nickglas@revalyze.io",
        password: await bcrypt.hash("password123", 10),
        role: "company_admin",
        name: "Nick",
        companyId: company.id,
        isActive: true,
      }).save();

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "password123" });

      accessToken = loginRes.body.accessToken;
    });

    it("should return 401 when companyId is not present", async () => {
      const res = await request(app)
        .patch(url)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });
      expect(res.status).toBe(401);
    });

    it("should return 400 when priceId is missing", async () => {
      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/priceId/i);
    });

    it("should return 400 when company is not found", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Company not found")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Company not found");
    });

    it("should return 400 when company has no active subscription", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Company has no active subscription")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Company has no active subscription");
    });

    it("should return 400 when no active subscription found", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("No active subscription found")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No active subscription found");
    });

    it("should return 400 when new price ID is missing", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("New price ID missing")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New price ID missing");
    });

    it("should return 400 when current price not found", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Current price not found")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Current price not found");
    });

    it("should return 400 when new price not found", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("New price not found")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New price not found");
    });

    it("should return 400 when current product ID missing", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Current product ID missing")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Current product ID missing");
    });

    it("should return 400 when new product ID missing", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("New product ID missing")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New product ID missing");
    });

    it("should return 400 when current product not found", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Current product not found")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Current product not found");
    });

    it("should return 400 when new product not found", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("New product not found")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New product not found");
    });

    it("should return 400 when product tier metadata missing", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Product tier metadata missing")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Product tier metadata missing");
    });

    it("should return 400 when already in the same tier", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Already in the same tier")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Already in the same tier");
    });

    it("should return 400 when subscription item data missing", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Subscription item data missing")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Subscription item data missing");
    });

    it("should return 400 when subscription period dates missing", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Subscription period dates missing")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Subscription period dates missing");
    });

    it("should return 500 when failed to create subscription schedule", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new Error("Failed to create subscription schedule")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Failed to create subscription schedule");
    });

    it("should return 400 when could not add new subscription", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new BadRequestError("Could not add new subscription")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Could not add new subscription");
    });

    it("should return 200 on successful downgrade schedule", async () => {
      mockCompanyService.updateSubscription.mockResolvedValueOnce({
        message: "Downgrade scheduled successfully",
        scheduleId: "schedule_123",
      });

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Downgrade scheduled successfully");
      expect(res.body.scheduleId).toBe("schedule_123");
    });

    it("should return 200 on successful upgrade", async () => {
      mockCompanyService.updateSubscription.mockResolvedValueOnce({
        message: "Subscription upgraded successfully",
      });

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Subscription upgraded successfully");
    });

    it("should return 500 on unknown subscription action", async () => {
      mockCompanyService.updateSubscription.mockRejectedValueOnce(
        new Error("Unknown subscription action")
      );

      const res = await request(app)
        .patch(url)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ priceId: "price_1Ray0AFNTWq4w3Fpyu3g5FOn" });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Unknown subscription action");
    });
  });

  describe("GET /api/v1/companies", () => {
    it("should return company data for admin user", async () => {
      mockCompanyService.getCompanyById.mockResolvedValue({
        name: "Admin Company",
      } as any);

      const res = await request(app)
        .get("/api/v1/companies")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "Admin Company");
    });

    it("should return company data for non-admin user", async () => {
      mockCompanyService.getCompanyById.mockResolvedValue({
        name: "User Company",
      } as any);

      const res = await request(app)
        .get("/api/v1/companies")
        .set("Authorization", `Bearer ${nonAdminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "User Company");
    });

    it("should return 404 when company not found", async () => {
      mockCompanyService.getCompanyById.mockRejectedValue(
        new BadRequestError("Company not found")
      );

      const res = await request(app)
        .get("/api/v1/companies")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/companies", () => {
    const basePayload = {
      companyName: "NewCo",
      companyMainEmail: "newco@example.com",
      companyPhone: "+3112345678",
      address: "1 New Street",
      subscriptionPlanId: "price_123abc",
      adminName: "Jane Doe",
      adminEmail: "jane@example.com",
      password: "StrongP@ss1",
      passwordConfirm: "StrongP@ss1",
    };

    it("should return 201 and checkoutUrl on successful registration", async () => {
      const res = await request(app)
        .post("/api/v1/companies")
        .send(basePayload)
        .expect(201);

      expect(res.body).toHaveProperty("checkoutUrl");
      expect(typeof res.body.checkoutUrl).toBe("string");
    });

    describe("Error handling", () => {
      it("should return 400 when Stripe customer creation fails", async () => {
        mockCompanyService.registerCompany.mockRejectedValueOnce(
          new BadRequestError("Failed to create Stripe customer")
        );

        const res = await request(app)
          .post("/api/v1/companies")
          .send(basePayload)
          .expect(400);

        expect(res.body.message).toBe("Failed to create Stripe customer");
      });

      it("should return 500 when pending registration save fails", async () => {
        mockCompanyService.registerCompany.mockRejectedValueOnce(
          new Error("Internal server error")
        );

        const res = await request(app)
          .post("/api/v1/companies")
          .send(basePayload)
          .expect(500);

        expect(res.body.message).toBe("Internal server error");
      });

      it("should return 400 when company email already exists", async () => {
        const payload = {
          ...basePayload,
          companyMainEmail: "existing@example.com",
        };

        mockCompanyService.registerCompany.mockRejectedValueOnce(
          new BadRequestError("Company with this email already exists")
        );

        const res = await request(app)
          .post("/api/v1/companies")
          .send(payload)
          .expect(400);

        expect(res.body.message).toBe("Company with this email already exists");
      });

      it("should return 400 when admin email is already registered", async () => {
        const payload = {
          ...basePayload,
          adminEmail: "existing-user@example.com",
        };

        mockCompanyService.registerCompany.mockRejectedValueOnce(
          new BadRequestError("User with this email is already registered")
        );

        const res = await request(app)
          .post("/api/v1/companies")
          .send(payload)
          .expect(400);

        expect(res.body.message).toBe(
          "User with this email is already registered"
        );
      });
    });

    describe("Validation", () => {
      const postRegister = (payload: any) =>
        request(app).post("/api/v1/companies").send(payload);

      it("should reject when companyName is missing", async () => {
        const { companyName, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyName" }),
          ])
        );
      });

      it("should reject when companyMainEmail is missing", async () => {
        const { companyMainEmail, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyMainEmail" }),
          ])
        );
      });

      it("should reject when companyMainEmail is invalid", async () => {
        const payload = { ...basePayload, companyMainEmail: "not-an-email" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyMainEmail" }),
          ])
        );
      });

      it("should reject when companyPhone is missing", async () => {
        const { companyPhone, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyPhone" }),
          ])
        );
      });

      it("should reject when address is missing", async () => {
        const { address, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "address" }),
          ])
        );
      });

      it("should reject when subscriptionPlanId is missing", async () => {
        const { subscriptionPlanId, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "subscriptionPlanId" }),
          ])
        );
      });

      it("should reject when adminName is missing", async () => {
        const { adminName, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminName" }),
          ])
        );
      });

      it("should reject when adminEmail is missing", async () => {
        const { adminEmail, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminEmail" }),
          ])
        );
      });

      it("should reject when adminEmail is invalid", async () => {
        const payload = { ...basePayload, adminEmail: "invalid-email" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminEmail" }),
          ])
        );
      });

      it("should reject when password is missing", async () => {
        const { password, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "password" }),
          ])
        );
      });

      it("should reject when passwordConfirm is missing", async () => {
        const { passwordConfirm, ...payload } = basePayload;
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "passwordConfirm" }),
          ])
        );
      });

      it("should reject when password is too short", async () => {
        const payload = {
          ...basePayload,
          password: "Shrt1!",
          passwordConfirm: "Shrt1!",
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "password" }),
          ])
        );
      });

      it("should reject when password lacks complexity", async () => {
        const payload = {
          ...basePayload,
          password: "alllowercase123",
          passwordConfirm: "alllowercase123",
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "password" }),
          ])
        );
      });

      it("should reject when passwords don't match", async () => {
        const payload = { ...basePayload, passwordConfirm: "Different123!" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "passwordConfirm" }),
          ])
        );
      });

      it("should reject when companyName is too short", async () => {
        const payload = { ...basePayload, companyName: "A" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyName" }),
          ])
        );
      });

      it("should reject when companyName is too long", async () => {
        const payload = { ...basePayload, companyName: "A".repeat(21) };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyName" }),
          ])
        );
      });

      it("should reject when companyMainEmail is too short", async () => {
        const payload = { ...basePayload, companyMainEmail: "a@b" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyMainEmail" }),
          ])
        );
      });

      it("should reject when companyMainEmail is too long", async () => {
        const payload = {
          ...basePayload,
          companyMainEmail: `${"a".repeat(25)}@mail.com`,
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyMainEmail" }),
          ])
        );
      });

      it("should reject when companyPhone is too short", async () => {
        const payload = { ...basePayload, companyPhone: "+3" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyPhone" }),
          ])
        );
      });

      it("should reject when companyPhone has invalid format", async () => {
        const payload = { ...basePayload, companyPhone: "123-456-7890" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "companyPhone" }),
          ])
        );
      });

      it("should reject when address is too short", async () => {
        const payload = { ...basePayload, address: "A" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "address" }),
          ])
        );
      });

      it("should reject when address is too long", async () => {
        const payload = { ...basePayload, address: "A".repeat(100) };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "address" }),
          ])
        );
      });

      it("should reject when adminName is too short", async () => {
        const payload = { ...basePayload, adminName: "A" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminName" }),
          ])
        );
      });

      it("should reject when adminName is too long", async () => {
        const payload = { ...basePayload, adminName: "A".repeat(21) };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminName" }),
          ])
        );
      });

      it("should reject when adminEmail is too short", async () => {
        const payload = { ...basePayload, adminEmail: "a@b" };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminEmail" }),
          ])
        );
      });

      it("should reject when adminEmail is too long", async () => {
        const payload = {
          ...basePayload,
          adminEmail: `${"a".repeat(25)}@mail.com`,
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "adminEmail" }),
          ])
        );
      });

      it("should reject when password lacks complexity", async () => {
        const payload = {
          ...basePayload,
          password: "weakpass",
          passwordConfirm: "weakpass",
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "password" }),
          ])
        );
      });

      it("should reject when password is too short", async () => {
        const payload = {
          ...basePayload,
          password: "A1@a",
          passwordConfirm: "A1@a",
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "password" }),
          ])
        );
      });

      it("should accept valid payload with international phone format", async () => {
        const payload = {
          ...basePayload,
          companyPhone: "+3112345678",
        };
        const res = await postRegister(payload);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("checkoutUrl");
      });
    });
  });

  describe("DELETE /api/v1/companies/subscriptions/scheduled", () => {
    const url = "/api/v1/companies/subscriptions/scheduled";

    it("should return 200 and success message when cancellation succeeds", async () => {
      // Create a subscription with scheduled update
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
        scheduledUpdate: {
          effectiveDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          priceId: "price_456",
          productId: "prod_456",
          productName: "Business Plan",
          amount: 1999,
          interval: "month",
          allowedUsers: 20,
          allowedTranscripts: 200,
          tier: 3,
          scheduleId: "sched_123",
        },
      });

      mockStripeService.cancelSubscriptionSchedule.mockResolvedValueOnce({
        id: "sched_123",
        status: "canceled",
      } as any);

      const res = await request(app)
        .delete(url)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "cancelled");
    });

    it("should return 401 when no access token is provided", async () => {
      const res = await request(app).delete(url);
      expect(res.status).toBe(401);
    });

    it("should return 400 when company subscription is not found", async () => {
      mockCompanyService.cancelScheduledSubscriptionByCompanyId.mockRejectedValueOnce(
        new BadRequestError("Company not found")
      );

      const res = await request(app)
        .delete(url)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Company not found");
    });

    it("should return 400 when no scheduled subscription exists", async () => {
      // Create subscription without scheduled update
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
      });

      mockCompanyService.cancelScheduledSubscriptionByCompanyId.mockRejectedValueOnce(
        new BadRequestError("No scheduled subscriptions found")
      );

      const res = await request(app)
        .delete(url)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No scheduled subscriptions found");
    });

    it("should return 500 when Stripe cancellation fails", async () => {
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
        scheduledUpdate: {
          effectiveDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          priceId: "price_456",
          productId: "prod_456",
          productName: "Business Plan",
          amount: 1999,
          interval: "month",
          allowedUsers: 20,
          allowedTranscripts: 200,
          tier: 3,
          scheduleId: "sched_123",
        },
      });

      mockCompanyService.cancelScheduledSubscriptionByCompanyId.mockRejectedValueOnce(
        new Error("Stripe API error")
      );

      const res = await request(app)
        .delete(url)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Stripe API error");
    });
  });

  describe("DELETE /api/v1/companies/subscriptions/cancel-active-subscription", () => {
    it("should cancel a valid subscription without scheduledUpdate", async () => {
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
      });

      const res = await request(app)
        .delete(`/api/v1/companies/subscriptions/cancel-active-subscription`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("cancelled", true);
    });

    it("should cancel a valid subscription with scheduledUpdate", async () => {
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
        scheduledUpdate: {
          effectiveDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          priceId: "price_456",
          productId: "prod_456",
          productName: "Business Plan",
          amount: 1999,
          interval: "month",
          allowedUsers: 20,
          allowedTranscripts: 200,
          tier: 3,
          scheduleId: "sched_123",
        },
      });

      const res = await request(app)
        .delete(`/api/v1/companies/subscriptions/cancel-active-subscription`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("cancelled", true);
    });

    it("should return 400 when Stripe fails to set cancel_at_period_end", async () => {
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
      });

      // Mock the company service method instead of Stripe directly
      mockCompanyService.cancelSubscriptions.mockRejectedValueOnce(
        new BadRequestError("Failed to schedule cancellation of subscription.")
      );

      const res = await request(app)
        .delete(`/api/v1/companies/subscriptions/cancel-active-subscription`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Failed to schedule cancellation of subscription."
      );
    });

    it("should return 500 when Stripe throws an unexpected error", async () => {
      await Subscription.create({
        companyId,
        stripeSubscriptionId: "sub_123",
        stripeCustomerId: "cus_123",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priceId: "price_123",
        productId: "prod_123",
        productName: "Premium Plan",
        amount: 999,
        currency: "eur",
        interval: "month",
        allowedUsers: 10,
        allowedTranscripts: 100,
        tier: 2,
      });

      mockCompanyService.cancelSubscriptions.mockRejectedValueOnce(
        new Error("Stripe API error")
      );

      const res = await request(app)
        .delete(`/api/v1/companies/subscriptions/cancel-active-subscription`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Stripe API error");
    });
  });
});
