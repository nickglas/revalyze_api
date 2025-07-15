// repositories/plan.repository.ts
import { Service } from "typedi";
import { PlanInput } from "../dto/plans/plan.input.dto";
import { IPlanDocument, PlanModel } from "../models/entities/plan.entity";

@Service()
export class PlanRepository {
  async findByStripeProductId(
    productId: string
  ): Promise<IPlanDocument | null> {
    return await PlanModel.findOne({ stripeProductId: productId }).exec();
  }

  async create(planData: Partial<IPlanDocument>): Promise<IPlanDocument> {
    const plan = new PlanModel(planData);
    return await plan.save();
  }

  async update(plan: IPlanDocument): Promise<IPlanDocument> {
    return await plan.save();
  }

  async findAll(): Promise<IPlanDocument[]> {
    return await PlanModel.find({}).exec();
  }

  async findById(planId: string): Promise<IPlanDocument | null> {
    return await PlanModel.findById(planId).exec();
  }

  async deleteByStripeProductId(
    productId: string
  ): Promise<{ deletedCount?: number }> {
    return await PlanModel.deleteOne({ stripeProductId: productId }).exec();
  }

  async upsert(planInput: PlanInput): Promise<IPlanDocument> {
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
