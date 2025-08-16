// repositories/plan.repository.ts
import { Service } from "typedi";
import { PlanInput } from "../dto/plans/plan.input.dto";
import { IPlanDocument, PlanModel } from "../models/entities/plan.entity";
import { BillingOption } from "../models/types/plan.type";

export interface BillingOptionWithPlan {
  billingOption: BillingOption;
  plan: Pick<
    IPlanDocument,
    | "name"
    | "stripeProductId"
    | "allowedUsers"
    | "allowedTranscripts"
    | "allowedReviews"
    | "isActive"
  >;
}

@Service()
export class PlanRepository {
  async findByStripeProductId(
    productId: string
  ): Promise<IPlanDocument | null> {
    return await PlanModel.findOne({ stripeProductId: productId }).exec();
  }

  async findPlanByPriceId(priceId: string): Promise<IPlanDocument | null> {
    return await PlanModel.findOne({
      "billingOptions.stripePriceId": priceId,
    }).exec();
  }

  async findBillingOptionByPriceId(
    priceId: string
  ): Promise<BillingOptionWithPlan | null> {
    const result = await PlanModel.aggregate([
      { $unwind: "$billingOptions" },
      { $match: { "billingOptions.stripePriceId": priceId } },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              { billingOption: "$billingOptions" },
              {
                plan: {
                  name: "$name",
                  stripeProductId: "$stripeProductId",
                  allowedUsers: "$allowedUsers",
                  allowedTranscripts: "$allowedTranscripts",
                  allowedReviews: "$allowedReviews",
                  isActive: "$isActive",
                },
              },
            ],
          },
        },
      },
    ]).exec();

    return result[0] ?? null;
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

  async findAvailable(): Promise<IPlanDocument[]> {
    return await PlanModel.find({
      isActive: true,
      isVisible: true,
    })
      .lean()
      .exec();
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
