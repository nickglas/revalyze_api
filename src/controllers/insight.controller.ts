import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import mongoose from "mongoose";
import { TranscriptService } from "../services/transcript.service";
import { CreateTranscriptDto } from "../dto/transcript/transcript.create.dto";
import { InsightsService } from "../services/insight.service";
import { BadRequestError } from "../utils/errors";
import { DashboardService } from "../services/dashboard.service";

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

export const getTrends = async (req: Request, res: Response) => {
  try {
    const { filter = "month" } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);

    const dashboardService = Container.get(DashboardService);
    const data = await dashboardService.getMetrics(
      companyId.toString(),
      filter.toString()
    );

    res.json({
      filter,
      data: data.map((d) => ({
        date: d.date,
        avgOverall: d.avgOverall,
        avgSentiment: d.avgSentiment,
        reviewCount: d.reviewCount,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load trends" });
  }
};

export const getCriteriaSummary = async (req: Request, res: Response) => {
  try {
    const { filter = "month" } = req.query;
    const companyId = req.user?.companyId;

    const dashboardService = Container.get(DashboardService);
    const summary = await dashboardService.getCriteriaSummary(
      companyId!.toString(),
      filter.toString()
    );

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to load criteria summary" });
  }
};

export const getCriteriaTrends = async (req: Request, res: Response) => {
  try {
    const { filter = "month", criterion } = req.query;
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);

    if (!criterion) {
      return res.status(400).json({ error: "Criterion name is required" });
    }

    const dashboardService = Container.get(DashboardService);
    const data = await dashboardService.getCriterionMetrics(
      companyId.toString(),
      criterion.toString(),
      filter.toString()
    );

    res.json({
      criterion,
      filter,
      data: data.map((d) => ({
        date: d.date,
        avgScore: d.avgScore,
        reviewCount: d.reviewCount,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load criteria trends" });
  }
};

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is missing" });
    }

    const dashboardService = Container.get(DashboardService);
    const metrics = await dashboardService.getDashboardMetrics(companyId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard metrics" });
  }
};

export const getTeamsPerformanceSentimentData = async (
  req: Request,
  res: Response
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is missing" });
    }

    const dashboardService = Container.get(DashboardService);
    const metrics = await dashboardService.getTeamMetrics(companyId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard metrics" });
  }
};

export const getSentimentDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const dashboardService = Container.get(DashboardService);
    const distribution = await dashboardService.getSentimentDistribution(days);

    res.status(200).json(distribution);
  } catch (err) {
    next(err);
  }
};

export const getSentimentTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const dashboardService = Container.get(DashboardService);
    const trends = await dashboardService.getSentimentTrends(days);

    res.status(200).json(trends);
  } catch (err) {
    next(err);
  }
};
