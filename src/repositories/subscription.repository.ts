import { Service } from "typedi";
import mongoose from "mongoose";
import Subscription, { ISubscription } from "../models/subscription.model";

@Service()
export class SubscriptionRepository {
  async find(): Promise<ISubscription[]> {
    return Subscription.find();
  }

  async findActive(): Promise<ISubscription[]> {
    return Subscription.find({ status: "active" });
  }

  async findById(id: string): Promise<ISubscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Subscription.findById(id);
  }

  async create(data: Partial<ISubscription>): Promise<ISubscription> {
    return Subscription.create(data);
  }

  async deleteById(id: string): Promise<ISubscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Subscription.findByIdAndDelete(id);
  }

  async update(
    id: string,
    data: Partial<ISubscription>
  ): Promise<ISubscription | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    return Subscription.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
}
