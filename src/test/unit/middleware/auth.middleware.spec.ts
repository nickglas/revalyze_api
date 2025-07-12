import { authenticate } from "../../../../src/middlewares/auth.middleware";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

jest.mock("jsonwebtoken");

describe("authenticate middleware", () => {
  let req: Partial<Request> & { headers: Record<string, string> };
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if no token is provided", () => {
    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", () => {
    req.headers.authorization = "Bearer invalid.token";
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token payload is missing required fields", () => {
    req.headers.authorization = "Bearer valid.token";
    (jwt.verify as jest.Mock).mockReturnValue({ id: "123" });

    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token payload" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user or company is inactive", () => {
    req.headers.authorization = "Bearer valid.token";
    (jwt.verify as jest.Mock).mockReturnValue({
      id: "123",
      name: "Test User",
      email: "test@example.com",
      role: "employee",
      companyId: "comp123",
      userIsActive: false,
      companyIsActive: true,
    });

    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "User or company is deactivated",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should set req.user and call next when token is valid", () => {
    const decodedPayload = {
      id: "123",
      name: "Test User",
      email: "test@example.com",
      role: "employee",
      companyId: "comp123",
      userIsActive: true,
      companyIsActive: true,
    };

    req.headers.authorization = "Bearer valid.token";
    (jwt.verify as jest.Mock).mockReturnValue(decodedPayload);

    authenticate(req as Request, res as Response, next);

    expect(req.user).toEqual({
      id: "123",
      name: "Test User",
      email: "test@example.com",
      role: "employee",
      companyId: "comp123",
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should return 401 if token is expired", () => {
    req.headers.authorization = "Bearer expired.token";
    (jwt.verify as jest.Mock).mockImplementation(() => {
      const err = new Error("jwt expired");
      (err as any).name = "TokenExpiredError";
      throw err;
    });

    authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });
});
