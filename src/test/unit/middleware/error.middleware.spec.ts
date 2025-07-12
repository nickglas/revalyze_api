import { errorHandler } from "../../../../src/middlewares/error.middleware";
import { logger } from "../../../../src/utils/logger";
import { Request, Response, NextFunction } from "express";

jest.mock("../../../../src/utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("errorHandler middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/api/resource",
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should log warning and send 404 for NotFoundError", () => {
    const err = {
      status: 404,
      message: "Resource not found",
    };

    errorHandler(err, req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalledWith(
      "GET /api/resource -> 404 Resource not found"
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Resource not found" });
  });

  it("should log warning and send 401 for UnauthorizedError", () => {
    const err = {
      status: 401,
      message: "Unauthorized",
    };

    errorHandler(err, req as Request, res as Response, next);

    expect(logger.warn).toHaveBeenCalledWith(
      "GET /api/resource -> 401 Unauthorized"
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("should log error and send 500 for unexpected error", () => {
    const err = {
      message: "Unexpected failure",
      stack: "fake-stack-trace",
    };

    errorHandler(err, req as Request, res as Response, next);

    expect(logger.error).toHaveBeenCalledWith(
      "GET /api/resource -> 500 Unexpected failure",
      { stack: "fake-stack-trace" }
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Unexpected failure" });
  });

  it("should send default message if message is missing", () => {
    const err = {
      status: 500,
    };

    errorHandler(err, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
  });
});
