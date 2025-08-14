// src/dtos/review.detail.dto.ts
import { ICriteriaScore } from "../../models/types/review.type";

export class ReviewDetailDto {
  _id: string;
  transcriptId: string;
  transcriptContent?: string;
  reviewConfig: {
    _id: string;
    name: string;
    description: string;
    criteria: {
      criterionId: string;
      weight: number;
      title: string;
      description: string;
    }[];
  };
  reviewStatus: string;
  type: string;
  subject: string;
  criteriaScores: ICriteriaScore[];
  overallScore: number;
  overallFeedback: string;
  externalCompanyId: string;
  externalCompanyName?: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  contactId: string;
  clientName?: string;
  clientEmail?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  sentimentAnalysis?: string;
  sentimentLabel?: string;
  sentimentScore?: number;

  constructor(review: any) {
    this._id = review._id.toString();
    this.transcriptId =
      review.transcriptId?._id?.toString() || review.transcriptId;
    this.transcriptContent = review.transcriptId?.content;

    this.reviewConfig = {
      ...review.reviewConfig,
      _id: review.reviewConfig?._id?.toString(),
      criteria: review.reviewConfig?.criteria?.map((c: any) => ({
        criterionId: c.criterionId?._id?.toString() || c.criterionId,
        weight: c.weight,
        title: c.criterionId?.title || "",
        description: c.criterionId?.description || "",
      })),
    };

    this.externalCompanyId =
      review.externalCompanyId?._id?.toString() || review.externalCompanyId;
    this.externalCompanyName = review.externalCompanyId?.name;

    this.employeeId = review.employeeId?._id?.toString() || review.employeeId;
    this.employeeName = review.employeeId?.name;
    this.employeeEmail = review.employeeId?.email;

    this.contactId = review.contactId?._id?.toString() || review.contactId;
    this.clientName = review.contactId?.name;
    this.clientEmail = review.contactId?.email;

    this.reviewStatus = review.reviewStatus;
    this.type = review.type;
    this.subject = review.subject;
    this.criteriaScores = review.criteriaScores;
    this.overallScore = review.overallScore;
    this.overallFeedback = review.overallFeedback;
    this.companyId = review.companyId.toString();
    this.createdAt = review.createdAt;
    this.updatedAt = review.updatedAt;
    this.sentimentAnalysis = review.sentimentAnalysis;
    this.sentimentLabel = review.sentimentLabel;
    this.sentimentScore = review.sentimentScore;
  }
}
