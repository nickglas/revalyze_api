export interface ReviewSummaryDto {
  _id: string;
  employee: { id: string; name: string };
  client?: { id: string; name: string };
  externalCompany?: { id: string; name: string };
  reviewStatus: "NOT_STARTED" | "STARTED" | "REVIEWED" | "ERROR";
  type: "performance" | "sentiment" | "both";
  overallScore?: number;
  sentimentScore?: number;
  sentimentLabel?: "negative" | "neutral" | "positive";
  createdAt: Date;
  error?: boolean;
}
