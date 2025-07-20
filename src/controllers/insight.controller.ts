import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import mongoose from "mongoose";
import { TranscriptService } from "../services/transcript.service";
import { CreateTranscriptDto } from "../dto/transcript/transcript.create.dto";
import { InsightsService } from "../services/insight.service";
import { BadRequestError } from "../utils/errors";

export const getEmployeeSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required" });
    }
    const service = Container.get(InsightsService);

    const summary = await service.getEmployeeSummary(employeeId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employeeId = req.user?.id;
    const { timeframe } = req.query;
    const timeframeStr: string =
      typeof timeframe === "string" ? timeframe : "month";

    const service = Container.get(InsightsService);
    const details = await service.getEmployeeDetails(employeeId!, timeframeStr);

    res.json(details);
  } catch (error) {
    next(error);
  }
};
