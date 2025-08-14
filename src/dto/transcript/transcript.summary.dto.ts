import { ReviewStatus } from "../../models/types/transcript.type";

export interface TranscriptSummaryDto {
  id: string;
  uploadedByName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  contactId: string | null;
  contactFirstName: string | null;
  contactEmail: string | null;
  externalCompanyId: string | null;
  externalCompanyName: string | null;
  externalCompanyEmail: string | null;
  timestamp: Date;
  reviewStatus: ReviewStatus;
  isReviewed: boolean;
  contentPreview: string;
  createdAt: Date;
}
