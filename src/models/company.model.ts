import mongoose, { Document, Schema } from "mongoose";

export interface IPendingSubscription {
  scheduleId: string;
  priceId: string;
  allowedUsers: number;
  allowedTranscripts: number;
  effectiveDate: Date;
}

export interface ICompany extends Document {
  name: string;
  mainEmail: string;
  phone?: string;
  address?: string;

  stripeCustomerId: string; // Stripe customer ID (from Stripe API)
  stripeSubscriptionId: string; // Stripe subscription ID (from Stripe API)
  isActive: boolean; // Whether the subscription is active in your system

  hashedApiKey?: string; // Hashed representation of the API key
  apiKeyCreatedAt?: Date; // Date api created
  allowedUsers: number; // Max number of users allowed under current plan
  allowedTranscripts: number; // Max number of transcripts allowed under current plan
  subscriptionStatus: string; // Stripe subscription status (e.g., 'active', 'trialing', 'canceled')
  subscriptionEndDate: Date; // End of the current billing cycle (from Stripe's `current_period_end`)
  pendingSubscription?: IPendingSubscription; // For scheduled downgrades

  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    mainEmail: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },

    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: false },

    hashedApiKey: { type: String, required: false },
    apiKeyCreatedAt: { type: Date, required: false },
    allowedUsers: { type: Number, required: true, default: 0 },
    allowedTranscripts: { type: Number, required: true, default: 0 },
    subscriptionStatus: { type: String, required: false },
    subscriptionEndDate: { type: Date, required: false },
    pendingSubscription: {
      type: {
        scheduleId: { type: String, required: true },
        priceId: { type: String, required: true },
        allowedUsers: { type: Number, required: true },
        allowedTranscripts: { type: Number, required: true },
        effectiveDate: { type: Date, required: true },
      },
      required: false,
    },
  },
  { timestamps: true }
);

const Company = mongoose.model<ICompany>("Company", companySchema);
export default Company;
