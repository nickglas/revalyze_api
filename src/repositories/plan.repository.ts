// repositories/plan.repository.ts
import { Service } from "typedi";
import Plan, { IPlan } from "../models/plan.model";
import { PlanInput } from "../dto/plans/plan.input.dto";

@Service()
export class PlanRepository {
  async findByStripeProductId(productId: string): Promise<IPlan | null> {
    return Plan.findOne({ stripeProductId: productId });
  }

  async create(planData: Partial<IPlan>): Promise<IPlan> {
    const plan = new Plan(planData);
    return plan.save();
  }

  async update(plan: IPlan): Promise<IPlan> {
    return plan.save();
  }

  async findAll(): Promise<IPlan[]> {
    return Plan.find({});
  }

  async findById(planId: string): Promise<IPlan | null> {
    return Plan.findById(planId);
  }

  async deleteByStripeProductId(
    productId: string
  ): Promise<{ deletedCount?: number }> {
    return Plan.deleteOne({ stripeProductId: productId });
  }

  async upsert(planInput: PlanInput): Promise<IPlan> {
    const existingPlan = await this.findByStripeProductId(
      planInput.stripeProductId
    );
    if (existingPlan) {
      Object.assign(existingPlan, planInput);
      return existingPlan.save();
    }
    return this.create(planInput);
  }
}
