// src/entities/transcript.entity.ts
import mongoose, { Schema, Document, model } from "mongoose";
import { ITranscriptData, ReviewStatus } from "../types/transcript.type";

export interface ITranscriptDocument extends ITranscriptData, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transcriptSchema = new Schema<ITranscriptDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    companyId: { type: Schema.Types.ObjectId, required: true, ref: "Company" },
    externalCompanyId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ExternalCompany",
    },
    contactId: { type: Schema.Types.ObjectId, required: true, ref: "Contact" },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.NOT_STARTED,
    },
    isReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const TranscriptModel = model<ITranscriptDocument>(
  "Transcript",
  transcriptSchema
);
