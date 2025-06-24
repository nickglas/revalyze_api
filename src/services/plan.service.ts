// services/plan.service.ts
import { PlanRepository } from "../repositories/plan.repository";
import { IPlan } from "../models/plan.model";
import { Service } from "typedi";
import { BadRequestError } from "../utils/errors";

@Service()
export class PlanService {
  constructor(private readonly planRepository: PlanRepository) {}

  async upsertPlan(planInput: {
    name: string;
    stripeProductId: string;
    currency: string;
    allowedUsers: number;
    allowedTranscripts: number;
    features?: string[];
    metadata?: Record<string, string>;
    billingOptions: {
      interval: "day" | "week" | "month" | "year" | "one_time";
      stripePriceId: string;
      amount: number;
    }[];
  }): Promise<IPlan> {
    const existingPlan = await this.planRepository.findByStripeProductId(
      planInput.stripeProductId
    );

    if (existingPlan) {
      existingPlan.name = planInput.name;
      existingPlan.currency = planInput.currency;
      existingPlan.allowedUsers = planInput.allowedUsers;
      existingPlan.allowedTranscripts = planInput.allowedTranscripts;
      existingPlan.features = planInput.features;
      existingPlan.metadata = planInput.metadata;
      existingPlan.billingOptions = planInput.billingOptions;
      return this.planRepository.update(existingPlan);
    }

    return this.planRepository.create({
      name: planInput.name,
      stripeProductId: planInput.stripeProductId,
      currency: planInput.currency,
      allowedUsers: planInput.allowedUsers,
      allowedTranscripts: planInput.allowedTranscripts,
      features: planInput.features,
      metadata: planInput.metadata,
      billingOptions: planInput.billingOptions,
    });
  }

  async getAllPlans(): Promise<IPlan[]> {
    return this.planRepository.findAll();
  }

  async deletePlan(
    stripeProductId: string
  ): Promise<{ deletedCount?: number }> {
    if (!stripeProductId) throw new BadRequestError("No plan id specified");
    return this.planRepository.deleteByStripeProductId(stripeProductId);
  }
}
