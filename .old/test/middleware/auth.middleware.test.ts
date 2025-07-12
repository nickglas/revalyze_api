import {
  authenticate,
  authorizeRole,
} from "../../../src/middlewares/auth.middleware";
import jwt from "jsonwebtoken";

// Set JWT secret for testing
process.env.JWT_SECRET = "testsecret";

describe("authenticate middleware", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 401 if no token provided", () => {
    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", () => {
    req.headers.authorization = "Bearer invalidtoken";
    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token payload is invalid", () => {
    req.headers.authorization = "Bearer validtoken";
    jest.spyOn(jwt, "verify").mockImplementation(() => ({ foo: "bar" } as any));

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token payload" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should set req.user and call next if token is valid", () => {
    const validPayload = {
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      role: "admin",
      companyId: "abc",
    };

    req.headers.authorization = "Bearer validtoken";
    // Return valid payload that matches middleware requirements
    jest.spyOn(jwt, "verify").mockImplementation(() => validPayload);

    authenticate(req, res, next);

    expect(req.user).toEqual(validPayload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("authorizeRole middleware", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should return 401 if req.user missing", () => {
    const middleware = authorizeRole(["admin"]);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user role not allowed", () => {
    req.user = { role: "user" };
    const middleware = authorizeRole(["admin"]);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: insufficient permissions",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next if user role allowed", () => {
    req.user = { role: "admin" };
    const middleware = authorizeRole(["admin", "superadmin"]);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
