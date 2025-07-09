import mongoose, { Document, Schema } from "mongoose";

export enum ReviewStatus {
  NOT_STARTED = "NOT_STARTED",
  STARTED = "STARTED",
  REVIEWED = "REVIEWED",
  ERROR = "ERROR",
}

export interface ITranscript extends Document {
  employeeId: mongoose.Types.ObjectId; // Wie de interactie had
  companyId: mongoose.Types.ObjectId; // Bijbehorend bedrijf
  externalCompanyId: mongoose.Types.ObjectId; // Reference naar external company
  contactId: mongoose.Types.ObjectId; // Reference naar het contact van de external company
  content: string; // De transcript zelf (platte tekst)
  timestamp: Date; // Wanneer het gesprek plaatsvond
  uploadedBy: mongoose.Types.ObjectId; // Gebruiker die het transcript uploadde
  reviewStatus: ReviewStatus;
  isReviewed: boolean;
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
    isReviewed: { type: Boolean, default: false },
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.NOT_STARTED,
    },
    uploadedBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

const Transcript = mongoose.model<ITranscript>("Transcript", transcriptSchema);
export default Transcript;
