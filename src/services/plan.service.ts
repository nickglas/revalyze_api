// services/plan.service.ts
import { PlanRepository } from "../repositories/plan.repository";
import { IPlanDocument, PlanModel } from "../models/entities/plan.entity";
import { Service } from "typedi";
import { BadRequestError } from "../utils/errors";
import { PlanDetailsDTO } from "../dto/plans/plan.details.dto";

@Service()
export class PlanService {
  constructor(private readonly planRepository: PlanRepository) {}

  async upsertPlan(planInput: {
    name: string;
    stripeProductId: string;
    currency: string;
    allowedUsers: number;
    allowedTranscripts: number;
    allowedReviews: number;
    isVisible: boolean;
    features?: string[];
    metadata?: Record<string, string>;
    billingOptions: {
      interval: "day" | "week" | "month" | "year" | "one_time";
      stripePriceId: string;
      amount: number;
      tier: number;
    }[];
  }): Promise<IPlanDocument> {
    const existingPlan = await this.planRepository.findByStripeProductId(
      planInput.stripeProductId
    );

    if (existingPlan) {
      existingPlan.name = planInput.name;
      existingPlan.currency = planInput.currency;
      existingPlan.allowedUsers = planInput.allowedUsers;
      existingPlan.allowedTranscripts = planInput.allowedTranscripts;
      existingPlan.allowedReviews = planInput.allowedReviews;
      existingPlan.isVisible = planInput.isVisible;
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
      allowedReviews: planInput.allowedReviews,
      isVisible: planInput.isVisible,
      features: planInput.features,
      metadata: planInput.metadata,
      billingOptions: planInput.billingOptions,
    });
  }

  async getAllPlans(): Promise<IPlanDocument[]> {
    return await this.planRepository.findAll();
  }

  async getAvailablePlans(): Promise<PlanDetailsDTO[]> {
    const plans = await this.planRepository.findAvailable();
    return plans.map((plan) => new PlanDetailsDTO(plan));
  }

  async deletePlan(
    stripeProductId: string
  ): Promise<{ deletedCount?: number }> {
    if (!stripeProductId) throw new BadRequestError("No plan id specified");
    return this.planRepository.deleteByStripeProductId(stripeProductId);
  }
}
