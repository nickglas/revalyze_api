import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import mongoose from "mongoose";
import { TranscriptService } from "../services/transcript.service";
import { CreateTranscriptDto } from "../dto/transcript/transcript.create.dto";

/**
 * GET /transcripts
 * Fetch paginated transcripts with optional filters and search.
 */
export const getTranscripts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const search = req.query.search?.toString();
    const employeeId = req.query.employeeId?.toString();
    const externalCompanyId = req.query.externalCompanyId?.toString();
    const contactId = req.query.contactId?.toString();
    const timestampFrom = req.query.timestampFrom
      ? new Date(req.query.timestampFrom.toString())
      : undefined;
    const timestampTo = req.query.timestampTo
      ? new Date(req.query.timestampTo.toString())
      : undefined;
    const createdAtFrom = req.query.createdAtFrom
      ? new Date(req.query.createdAtFrom.toString())
      : undefined;
    const createdAtTo = req.query.createdAtTo
      ? new Date(req.query.createdAtTo.toString())
      : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const transcriptService = Container.get(TranscriptService);
    const { transcripts, total } = await transcriptService.getTranscripts(
      companyId,
      search,
      employeeId,
      externalCompanyId,
      contactId,
      timestampFrom,
      timestampTo,
      createdAtFrom,
      createdAtTo,
      page,
      limit
    );

    res.status(200).json({
      data: transcripts,
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
 * GET /transcripts/:id
 * Fetch a specific transcript by ID (must belong to the company).
 */
export const getTranscriptById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;

    const transcriptService = Container.get(TranscriptService);
    const transcript = await transcriptService.getById(id, companyId);

    res.status(200).json(transcript);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /transcripts/:id/reviews
 * Fetch all reviews for a specific transcript.
 */
export const getReviewsByTranscriptId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;

    const transcriptService = Container.get(TranscriptService);
    const reviews = await transcriptService.getReviewsById(id, companyId);

    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /transcripts
 * Create a new transcript.
 */
export const createTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const employeeId = new mongoose.Types.ObjectId(req.user?.id);
    const uploadedBy = new mongoose.Types.ObjectId(req.user?.id);
    const role = req.user?.role;
    const dto = req.body as CreateTranscriptDto;

    const transcriptService = Container.get(TranscriptService);
    const newTranscript = await transcriptService.createTranscript(
      dto,
      companyId,
      employeeId,
      uploadedBy,
      role!
    );

    res.status(201).json(newTranscript);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /transcripts/:id
 * Delete a transcript if it belongs to the company.
 */
export const deleteTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user?.companyId);
    const { id } = req.params;

    const transcriptService = Container.get(TranscriptService);
    const deleted = await transcriptService.deleteTranscriptById(id, companyId);

    res.status(200).json(deleted);
  } catch (error) {
    next(error);
  }
};
