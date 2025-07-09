import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import Subscription, { ISubscription } from "../models/subscription.model";

@Service()
export class SubscriptionRepository {
  async find(): Promise<ISubscription[]> {
    return await Subscription.find().exec();
  }

  async findOne(
    filter: FilterQuery<ISubscription>
  ): Promise<ISubscription | null> {
    return await Subscription.findOne(filter).exec();
  }

  async findActive(): Promise<ISubscription[]> {
    return await Subscription.find({ status: "active" }).exec();
  }

  // Finds the latest active subscription for a company by stripeCustomerId
  async findActiveSubscriptionByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<ISubscription | null> {
    return await Subscription.findOne({ stripeCustomerId }).exec();
  }

  async findById(id: string): Promise<ISubscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Subscription.findById(id).exec();
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<ISubscription | null> {
    return await Subscription.findOne({ stripeSubscriptionId }).exec();
  }

  async create(data: Partial<ISubscription>): Promise<ISubscription> {
    return await Subscription.create(data);
  }

  async deleteById(id: string): Promise<ISubscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Subscription.findByIdAndDelete(id).exec();
  }

  async update(
    id: string,
    data: Partial<ISubscription>
  ): Promise<ISubscription | null> {
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

    return await Subscription.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).exec();
  }
}
