import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import {
  SubscriptionModel,
  ISubscriptionDocument,
} from "../models/entities/subscription.entity";

@Service()
export class SubscriptionRepository {
  async find(): Promise<ISubscriptionDocument[]> {
    return await SubscriptionModel.find().exec();
  }

  async findOne(
    filter: FilterQuery<ISubscriptionDocument>
  ): Promise<ISubscriptionDocument | null> {
    return await SubscriptionModel.findOne(filter).exec();
  }

  async findActive(): Promise<ISubscriptionDocument[]> {
    return await SubscriptionModel.find({ status: "active" }).exec();
  }

  async findActiveSubscriptionByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<ISubscriptionDocument | null> {
    return await SubscriptionModel.findOne({ stripeCustomerId }).exec();
  }

  async findById(id: string): Promise<ISubscriptionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await SubscriptionModel.findById(id).exec();
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<ISubscriptionDocument | null> {
    return await SubscriptionModel.findOne({ stripeSubscriptionId }).exec();
  }

  async create(
    data: Partial<ISubscriptionDocument>
  ): Promise<ISubscriptionDocument> {
    return await SubscriptionModel.create(data);
  }

  async deleteById(id: string): Promise<ISubscriptionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await SubscriptionModel.findByIdAndDelete(id).exec();
  }

  async update(
    id: string,
    data: Partial<ISubscriptionDocument>
  ): Promise<ISubscriptionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const update: any = {};
    const unset: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined) {
        unset[key] = 1;
      } else {
        if (!update.$set) update.$set = {};
        update.$set[key] = value;
      }
    });

    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }

    return await SubscriptionModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async upsertByCompanyId(
    companyId: mongoose.Types.ObjectId,
    updateData: Partial<ISubscriptionDocument>
  ): Promise<ISubscriptionDocument> {
    return await SubscriptionModel.findOneAndUpdate(
      { companyId },
      { ...updateData, companyId, updatedAt: new Date() },
      { upsert: true, new: true }
    ).exec();
  }
}
