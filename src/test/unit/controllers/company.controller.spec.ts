// src/test/unit/controllers/company.controller.spec.ts
import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import * as companyController from "../../../controllers/company.controller";
import { CompanyService } from "../../../services/company.service";
import { RegisterCompanyDto } from "../../../dto/company/register.company.dto";
import { BadRequestError } from "../../../utils/errors";

describe("CompanyController", () => {
  describe("register", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        body: {
          companyMainEmail: "test@example.com",
          companyName: "Test Company",
          adminEmail: "admin@example.com",
          password: "password123",
          subscriptionPlanId: "plan_123",
        } as RegisterCompanyDto,
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        registerCompany: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should register company successfully and return checkoutUrl", async () => {
      const mockResult = { checkoutUrl: "http://stripe-checkout.com/session" };
      companyServiceMock.registerCompany.mockResolvedValue(mockResult);

      await companyController.register(req as Request, res as Response, next);

      expect(companyServiceMock.registerCompany).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error if registerCompany throws", async () => {
      const error = new Error("Registration error");
      companyServiceMock.registerCompany.mockRejectedValue(error);

      await companyController.register(req as Request, res as Response, next);

      expect(companyServiceMock.registerCompany).toHaveBeenCalledWith(req.body);
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getCompany", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          companyId: "company_123",
        } as any,
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        getCompanyById: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return company data when companyId exists", async () => {
      const mockCompany = { id: "company_123", name: "Test Company" };
      companyServiceMock.getCompanyById.mockResolvedValue(mockCompany as any);

      await companyController.getCompany(req as Request, res as Response, next);

      expect(companyServiceMock.getCompanyById).toHaveBeenCalledWith(
        "company_123"
      );
      expect(res.json).toHaveBeenCalledWith(mockCompany);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if companyId is missing", async () => {
      req.user = undefined;

      await companyController.getCompany(req as Request, res as Response, next);

      expect(companyServiceMock.getCompanyById).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User companyId missing");
    });

    it("should call next with error if getCompanyById throws", async () => {
      const error = new Error("Service failure");
      companyServiceMock.getCompanyById.mockRejectedValue(error);

      await companyController.getCompany(req as Request, res as Response, next);

      expect(companyServiceMock.getCompanyById).toHaveBeenCalledWith(
        "company_123"
      );
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateCompany", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          id: "user_123",
          companyId: "company_123",
        } as any,
        body: {
          companyName: "Updated Company",
        },
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        updateCompanyById: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should update company and return updated company", async () => {
      const updatedCompany = {
        id: "company_123",
        companyName: "Updated Company",
      };
      companyServiceMock.updateCompanyById.mockResolvedValue(
        updatedCompany as any
      );

      await companyController.updateCompany(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateCompanyById).toHaveBeenCalledWith(
        "user_123",
        "company_123",
        req.body
      );
      expect(res.json).toHaveBeenCalledWith(updatedCompany);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if userId or companyId missing", async () => {
      req.user = { id: undefined, companyId: undefined } as any;

      await companyController.updateCompany(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateCompanyById).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User ID or Company ID missing");
    });

    it("should call next with error if updateCompanyById throws", async () => {
      const error = new Error("Update failure");
      companyServiceMock.updateCompanyById.mockRejectedValue(error);

      await companyController.updateCompany(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateCompanyById).toHaveBeenCalledWith(
        "user_123",
        "company_123",
        req.body
      );
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateSubscription", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          companyId: "company_123",
        } as any,
        body: {
          priceId: "price_456",
        },
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        updateSubscription: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call updateSubscription and return result", async () => {
      const updateResult = { message: "Subscription updated" };
      companyServiceMock.updateSubscription.mockResolvedValue(
        updateResult as any
      );

      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).toHaveBeenCalledWith(
        "company_123",
        "price_456"
      );
      expect(res.json).toHaveBeenCalledWith(updateResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if companyId is missing", async () => {
      req.user = {} as any;
      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User companyId missing");
    });

    it("should throw BadRequestError if priceId is missing", async () => {
      req.body = {};
      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("Missing priceId");
    });

    it("should call next with error if updateSubscription throws", async () => {
      const error = new Error("Update failure");
      companyServiceMock.updateSubscription.mockRejectedValue(error);

      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).toHaveBeenCalledWith(
        "company_123",
        "price_456"
      );
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateSubscription", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          companyId: "company_123",
        } as any,
        body: {
          priceId: "price_456",
        },
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        updateSubscription: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call updateSubscription and return result", async () => {
      const updateResult = { message: "Subscription updated" };
      companyServiceMock.updateSubscription.mockResolvedValue(
        updateResult as any
      );

      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).toHaveBeenCalledWith(
        "company_123",
        "price_456"
      );
      expect(res.json).toHaveBeenCalledWith(updateResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if companyId is missing", async () => {
      req.user = {} as any;
      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User companyId missing");
    });

    it("should throw BadRequestError if priceId is missing", async () => {
      req.body = {};
      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("Missing priceId");
    });

    it("should call next with error if updateSubscription throws", async () => {
      const error = new Error("Update failure");
      companyServiceMock.updateSubscription.mockRejectedValue(error);

      await companyController.updateSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.updateSubscription).toHaveBeenCalledWith(
        "company_123",
        "price_456"
      );
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("cancelScheduledSubscription", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          companyId: "company_123",
        } as any,
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        cancelScheduledSubscriptionByCompanyId: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call cancelScheduledSubscriptionByCompanyId and return result", async () => {
      const mockResult = { message: "Subscription schedule cancelled" };
      companyServiceMock.cancelScheduledSubscriptionByCompanyId.mockResolvedValue(
        mockResult as any
      );

      await companyController.cancelScheduledSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(
        companyServiceMock.cancelScheduledSubscriptionByCompanyId
      ).toHaveBeenCalledWith("company_123");
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if companyId is missing", async () => {
      req.user = {} as any;

      await companyController.cancelScheduledSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(
        companyServiceMock.cancelScheduledSubscriptionByCompanyId
      ).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User companyId missing");
    });

    it("should call next with error if service method throws", async () => {
      const error = new Error("Service failure");
      companyServiceMock.cancelScheduledSubscriptionByCompanyId.mockRejectedValue(
        error
      );

      await companyController.cancelScheduledSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(
        companyServiceMock.cancelScheduledSubscriptionByCompanyId
      ).toHaveBeenCalledWith("company_123");
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("cancelScheduledSubscription", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          companyId: "company_123",
        } as any,
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        cancelScheduledSubscriptionByCompanyId: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call cancelScheduledSubscriptionByCompanyId and return result", async () => {
      const mockResult = { message: "Subscription schedule cancelled" };
      companyServiceMock.cancelScheduledSubscriptionByCompanyId.mockResolvedValue(
        mockResult as any
      );

      await companyController.cancelScheduledSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(
        companyServiceMock.cancelScheduledSubscriptionByCompanyId
      ).toHaveBeenCalledWith("company_123");
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if companyId is missing", async () => {
      req.user = {} as any;

      await companyController.cancelScheduledSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(
        companyServiceMock.cancelScheduledSubscriptionByCompanyId
      ).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User companyId missing");
    });

    it("should call next with error if service method throws", async () => {
      const error = new Error("Service failure");
      companyServiceMock.cancelScheduledSubscriptionByCompanyId.mockRejectedValue(
        error
      );

      await companyController.cancelScheduledSubscription(
        req as Request,
        res as Response,
        next
      );

      expect(
        companyServiceMock.cancelScheduledSubscriptionByCompanyId
      ).toHaveBeenCalledWith("company_123");
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("cancelSubscriptions", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let companyServiceMock: jest.Mocked<CompanyService>;

    beforeEach(() => {
      req = {
        user: {
          companyId: "company_123",
        } as any,
      };

      res = {
        json: jest.fn(),
      };

      next = jest.fn();

      companyServiceMock = {
        cancelSubscriptions: jest.fn(),
      } as any;

      jest.spyOn(Container, "get").mockReturnValue(companyServiceMock);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call cancelSubscriptions and return result", async () => {
      const mockResult = { message: "Subscriptions cancelled" };
      companyServiceMock.cancelSubscriptions.mockResolvedValue(
        mockResult as any
      );

      await companyController.cancelSubscriptions(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.cancelSubscriptions).toHaveBeenCalledWith(
        "company_123"
      );
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(next).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if companyId is missing", async () => {
      req.user = {} as any;

      await companyController.cancelSubscriptions(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.cancelSubscriptions).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("User companyId missing");
    });

    it("should call next with error if service method throws", async () => {
      const error = new Error("Service failure");
      companyServiceMock.cancelSubscriptions.mockRejectedValue(error);

      await companyController.cancelSubscriptions(
        req as Request,
        res as Response,
        next
      );

      expect(companyServiceMock.cancelSubscriptions).toHaveBeenCalledWith(
        "company_123"
      );
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
