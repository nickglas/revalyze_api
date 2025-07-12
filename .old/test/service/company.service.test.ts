import "reflect-metadata";
import { Types } from "mongoose";
import * as companyService from "../../services/company.service";
import Company from "../../models/company.model";
import User from "../../models/user.model";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../utils/errors";
import { CompanyService } from "../../services/company.service";
import Container from "typedi";
import { CompanyRepository } from "../../repositories/company.repository";
import { StripeService } from "../../services/stripe.service";
import { RegisterCompanyDto } from "../../dto/company/register.company.dto";
import { UserRepository } from "../../repositories/user.repository";
import { PendingCompanyRepository } from "../../repositories/pending.repository";

jest.mock("../../models/company.model");
jest.mock("../../models/user.model");
jest.mock("../../services/stripe.service");
jest.mock("../../repositories/pending.repository.ts");

describe("Company Service", () => {
  let companyService: CompanyService;

  beforeEach(async () => {
    Container.set(UserRepository, {
      findByEmail: jest.fn(),
    });
    Container.set(CompanyRepository, {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    });
    Container.set(StripeService, {
      createCustomer: jest.fn(),
      createCheckoutSession: jest.fn(),
      deleteCustomer: jest.fn(),
    });
    Container.set(PendingCompanyRepository, {
      create: jest.fn(),
    });
    companyService = Container.get(CompanyService);

    const company = await new Company({
      name: "Revalyze",
      mainEmail: "nickglas@revalyze.io",
      subscriptionPlanId: "plan_pro",
    });

    await company.save();
  });

  afterEach(() => {
    jest.clearAllMocks();
    Container.reset();
  });

  describe("Register", () => {
    let payload: RegisterCompanyDto = {
      address: "Some address 12",
      adminEmail: "nickglas@revalyze.io",
      adminName: "Nick Glas",
      companyMainEmail: "nickglas@revalyze.io",
      companyName: "Revalyze",
      companyPhone: "+31 6 34656774",
      password: "test12345",
      passwordConfirm: "test12345",
      subscriptionPlanId: "some_id",
    };

    it("Registers successfully using the payload", async () => {
      const mockCompanyRepo = Container.get(CompanyRepository);
      const mockUserRepo = Container.get(UserRepository);
      const mockStripe = Container.get(StripeService);
      const mockPendingRepo = Container.get(PendingCompanyRepository);

      // No existing company or user
      (mockCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);

      // Mock Stripe customer creation success
      (mockStripe.createCustomer as jest.Mock).mockResolvedValue({
        id: "cus_12345",
      });

      // Mock Stripe checkout session success
      (mockStripe.createCheckoutSession as jest.Mock).mockResolvedValue({
        url: "https://checkout.url",
      });

      // Mock saving pending registration success
      (mockPendingRepo.create as jest.Mock).mockResolvedValue({
        _id: "pending_123",
      });

      // Call the service method
      const result = await companyService.registerCompany(payload);

      // Assert the returned checkout URL is as expected
      expect(result).toEqual({ checkoutUrl: "https://checkout.url" });

      // Assert company existence checked
      expect(mockCompanyRepo.findOne).toHaveBeenCalledWith({
        mainEmail: payload.companyMainEmail,
      });

      // Assert user existence checked
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(payload.adminEmail);

      // Assert Stripe customer created with correct args
      expect(mockStripe.createCustomer).toHaveBeenCalledWith(
        payload.companyMainEmail,
        payload.companyName
      );

      // Assert Stripe checkout session created with correct args
      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith({
        mode: "subscription",
        customer: "cus_12345",
        line_items: [
          {
            price:
              payload.subscriptionPlanId ?? "price_1Rax57FNTWq4w3FpEexAMksM",
            quantity: 1,
          },
        ],
        success_url: "https://www.google.com",
        cancel_url: "https://www.google.com",
      });

      // Assert pending registration saved with correct hashed password and info
      expect(mockPendingRepo.create).toHaveBeenCalled();

      // Optionally check that password was hashed (cannot check exact hash, but ensure it's a string)
      const calledArg = (mockPendingRepo.create as jest.Mock).mock.calls[0][0];
      expect(typeof calledArg.password).toBe("string");
      expect(calledArg.password).not.toBe(payload.password); // Should be hashed, so different from raw password
    });

    it("Throws BadRequestError if conpany email exists", async () => {
      const mockRepo = Container.get(CompanyRepository);
      (mockRepo.findOne as jest.Mock).mockResolvedValue({ _id: "some-id" }); // Simulate company found

      await expect(companyService.registerCompany(payload)).rejects.toThrow(
        BadRequestError
      );
    });

    it("Throws BadRequestError if user with this email is already registered", async () => {
      const mockCompanyRepo = Container.get(CompanyRepository);
      const mockUserRepo = Container.get(UserRepository);

      (mockCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue({
        _id: "user-id",
      });

      await expect(companyService.registerCompany(payload)).rejects.toThrow(
        new BadRequestError("User with this email is already registered")
      );
    });

    it("throws BadRequestError if Stripe customer creation fails", async () => {
      const mockCompanyRepo = Container.get(CompanyRepository);
      const mockUserRepo = Container.get(UserRepository);
      const mockStripeService = Container.get(StripeService);

      (mockCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockStripeService.createCustomer as jest.Mock).mockResolvedValue(null);

      await expect(companyService.registerCompany(payload)).rejects.toThrow(
        new BadRequestError("Failed to create Stripe customer")
      );
    });

    it("Throws BadRequestError if Stripe Checkout session creation fails", async () => {
      const mockCompanyRepo = Container.get(CompanyRepository);
      const mockUserRepo = Container.get(UserRepository);
      const mockStripe = Container.get(StripeService);

      (mockCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);
      // Simuleer: klant wordt succesvol aangemaakt
      (mockStripe.createCustomer as jest.Mock).mockResolvedValue({
        id: "cus_123",
      });

      // Simuleer: sessie is ongeldig (null of zonder url)
      (mockStripe.createCheckoutSession as jest.Mock).mockResolvedValue(null);

      await expect(companyService.registerCompany(payload)).rejects.toThrow(
        new BadRequestError("Failed to create Stripe Checkout session")
      );
    });

    it("Rolls back Stripe customer if saving pending company fails", async () => {
      const mockCompanyRepo = Container.get(CompanyRepository);
      const mockUserRepo = Container.get(UserRepository);
      const mockStripe = Container.get(StripeService);

      const mockPendingRepo = Container.get(PendingCompanyRepository);

      mockPendingRepo.create = jest
        .fn()
        .mockRejectedValue(new Error("MongoDB error"));

      (mockCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockUserRepo.findByEmail as jest.Mock).mockResolvedValue(null);

      const customerId = "cus_rollback_123";
      const mockDeleteCustomer = jest
        .fn()
        .mockResolvedValue({ id: customerId, deleted: true });

      (mockStripe.createCustomer as jest.Mock).mockResolvedValue({
        id: customerId,
      });
      (mockStripe.createCheckoutSession as jest.Mock).mockResolvedValue({
        url: "https://checkout.url",
      });
      (mockStripe.deleteCustomer as jest.Mock).mockImplementation(
        mockDeleteCustomer
      );

      await expect(companyService.registerCompany(payload)).rejects.toThrow(
        "MongoDB error"
      );

      expect(mockDeleteCustomer).toHaveBeenCalledWith(customerId);
    });
  });

  describe("getCompanyById", () => {
    it("throws BadRequestError if companyId is invalid", async () => {
      await expect(companyService.getCompanyById("invalid-id")).rejects.toThrow(
        BadRequestError
      );
    });

    it("throws NotFoundError if company not found", async () => {
      (Company.findById as jest.Mock).mockResolvedValue(null);

      const id = new Types.ObjectId().toString();
      await expect(companyService.getCompanyById(id)).rejects.toThrow(
        NotFoundError
      );
    });

    it("returns company if found", async () => {
      const fakeCompany = { _id: new Types.ObjectId(), name: "TestCo" };
      (Company.findById as jest.Mock).mockResolvedValue(fakeCompany);

      const id = new Types.ObjectId().toString();
      const result = await companyService.getCompanyById(id);
      expect(result).toEqual(fakeCompany);
      expect(Company.findById).toHaveBeenCalledWith(id);
    });
  });

  describe("updateCompanyById", () => {
    const validCompanyId = new Types.ObjectId().toString();
    const validUserId = new Types.ObjectId().toString();

    const companyAdminUser = {
      _id: validUserId,
      role: "company_admin",
      companyId: validCompanyId,
    };

    it("throws BadRequestError if companyId or userId invalid", async () => {
      await expect(
        companyService.updateCompanyById("invalid", validCompanyId, {})
      ).rejects.toThrow(BadRequestError);

      await expect(
        companyService.updateCompanyById(validUserId, "invalid", {})
      ).rejects.toThrow(BadRequestError);
    });

    it("throws NotFoundError if user not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        companyService.updateCompanyById(validUserId, validCompanyId, {})
      ).rejects.toThrow(NotFoundError);
    });

    it("throws UnauthorizedError if user is not company_admin", async () => {
      (User.findById as jest.Mock).mockResolvedValue({
        role: "employee",
        companyId: validCompanyId,
      });
      await expect(
        companyService.updateCompanyById(validUserId, validCompanyId, {})
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError if user companyId does not match", async () => {
      (User.findById as jest.Mock).mockResolvedValue({
        role: "company_admin",
        companyId: new Types.ObjectId().toString(),
      });
      await expect(
        companyService.updateCompanyById(validUserId, validCompanyId, {})
      ).rejects.toThrow(UnauthorizedError);
    });

    it("filters updates to only allowed fields and updates company", async () => {
      const updates = {
        mainEmail: "newemail@test.com",
        phone: "123456789",
        address: "New Address",
        invalidField: "shouldBeIgnored",
      };

      (User.findById as jest.Mock).mockResolvedValue(companyAdminUser);
      (Company.findByIdAndUpdate as jest.Mock).mockImplementation(
        (id, filteredUpdates) => {
          // Return filteredUpdates to check what was saved
          return Promise.resolve({ ...filteredUpdates, _id: id });
        }
      );

      const result = await companyService.updateCompanyById(
        validUserId,
        validCompanyId,
        updates
      );

      expect(Company.findByIdAndUpdate).toHaveBeenCalledWith(
        validCompanyId,
        {
          mainEmail: updates.mainEmail,
          phone: updates.phone,
          address: updates.address,
        },
        { new: true }
      );

      expect(result).toEqual({
        mainEmail: updates.mainEmail,
        phone: updates.phone,
        address: updates.address,
        _id: validCompanyId,
      });
    });

    it("throws NotFoundError if company not found during update", async () => {
      (User.findById as jest.Mock).mockResolvedValue(companyAdminUser);
      (Company.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(
        companyService.updateCompanyById(validUserId, validCompanyId, {
          mainEmail: "x",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
