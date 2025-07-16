import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import mongoose from "mongoose";
import { ReviewService } from "../services/review.service";

/**
 * GET /reviews
 * Fetch paginated and filtered reviews for the current company
 */
export const getReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);

    const {
      transcriptId,
      type,
      employeeId,
      externalCompanyId,
      clientId,
      createdAtFrom,
      createdAtTo,
    } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const reviewService = Container.get(ReviewService);
    const { reviews, total } = await reviewService.getReviews(
      companyId,
      transcriptId?.toString(),
      type as "performance" | "sentiment" | "both",
      employeeId?.toString(),
      externalCompanyId?.toString(),
      clientId?.toString(),
      createdAtFrom ? new Date(createdAtFrom.toString()) : undefined,
      createdAtTo ? new Date(createdAtTo.toString()) : undefined,
      page,
      limit
    );

    res.status(200).json({
      data: reviews,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reviews/:id
 * Fetch a review by its ID
 */
export const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const reviewId = req.params.id;

    const reviewService = Container.get(ReviewService);
    const review = await reviewService.getById(reviewId, companyId);

    res.status(200).json(review);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /reviews
 * Create a new review from a transcript and review config
 */
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const subscription = req.user?.companySubscription;
    const dto = req.body;

    const reviewService = Container.get(ReviewService);
    const review = await reviewService.createReview(
      dto,
      companyId,
      subscription
    );

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};
