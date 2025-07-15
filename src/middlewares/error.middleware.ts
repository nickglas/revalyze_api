// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger"; // use your actual logger file

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  // Expected errors (do not log stack traces)
  const expectedStatuses = [400, 401, 403, 404];

  if (expectedStatuses.includes(status)) {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status} ${message}`);
  } else {
    logger.error(`${req.method} ${req.originalUrl} -> ${status} ${message}`, {
      stack: err.stack,
    });
  }

  res.status(status).json({ message });
};
