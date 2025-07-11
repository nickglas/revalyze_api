import mongoose, { Document, Schema } from "mongoose";

export enum ReviewStatus {
  NOT_STARTED = "NOT_STARTED",
  STARTED = "STARTED",
  REVIEWED = "REVIEWED",
  ERROR = "ERROR",
}

export interface ITranscript extends Document {
  employeeId: mongoose.Types.ObjectId; // Who had the interaction
  companyId: mongoose.Types.ObjectId; // Associated company
  externalCompanyId: mongoose.Types.ObjectId; // Reference to external company
  contactId: mongoose.Types.ObjectId; // Reference to contact of external company
  content: string; // Transcript text
  timestamp: Date; // When the conversation took place
  uploadedBy: mongoose.Types.ObjectId; // User who uploaded the transcript
  reviewStatus: ReviewStatus; // Current review status on transcript (optional)
  isReviewed: boolean; // Flag if reviewed
  createdAt: Date;
  updatedAt: Date;
}

const transcriptSchema = new Schema<ITranscript>(
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

const Transcript = mongoose.model<ITranscript>("Transcript", transcriptSchema);
export default Transcript;
