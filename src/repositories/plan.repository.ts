// repositories/plan.repository.ts
import { Service } from "typedi";
import Plan, { IPlan } from "../models/plan.model";
import { PlanInput } from "../dto/plans/plan.input.dto";

@Service()
export class PlanRepository {
  async findByStripeProductId(productId: string): Promise<IPlan | null> {
    return await Plan.findOne({ stripeProductId: productId }).exec();
  }

  async create(planData: Partial<IPlan>): Promise<IPlan> {
    const plan = new Plan(planData);
    return await plan.save();
  }

  async update(plan: IPlan): Promise<IPlan> {
    return await plan.save();
  }

  async findAll(): Promise<IPlan[]> {
    return await Plan.find({}).exec();
  }

  async findById(planId: string): Promise<IPlan | null> {
    return await Plan.findById(planId).exec();
  }

  async deleteByStripeProductId(
    productId: string
  ): Promise<{ deletedCount?: number }> {
    return await Plan.deleteOne({ stripeProductId: productId }).exec();
  }

  async upsert(planInput: PlanInput): Promise<IPlan> {
    const existingPlan = await this.findByStripeProductId(
      planInput.stripeProductId
    );
    if (existingPlan) {
      Object.assign(existingPlan, planInput);
      return await existingPlan.save();
    }
    return await this.create(planInput);
  }
}
