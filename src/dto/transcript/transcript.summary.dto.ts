import { ReviewStatus } from "../../models/types/review.type";

export interface TranscriptSummaryDto {
  id: string;
  uploadedByName: string;
  employeeName: string;
  contactName: string;
  externalCompany: string | null;
  timestamp: Date;
  reviewStatus: ReviewStatus;
  isReviewed: boolean;
  contentPreview: string;
  createdAt: Date;
}
