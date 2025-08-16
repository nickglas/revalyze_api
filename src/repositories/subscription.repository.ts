import { Service } from "typedi";
import mongoose, { FilterQuery, ClientSession } from "mongoose";
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

  async findLatestTrial(
    filter: FilterQuery<ISubscriptionDocument>
  ): Promise<ISubscriptionDocument | null> {
    return await SubscriptionModel.findOne(filter)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findLatestActiveByCompanyId(
    companyId: string
  ): Promise<ISubscriptionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(companyId)) return null;

    return await SubscriptionModel.findOne({
      companyId: new mongoose.Types.ObjectId(companyId),
      status: "active",
    })
      .sort({ createdAt: -1 })
      .exec();
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
    data: Partial<ISubscriptionDocument>,
    session?: ClientSession
  ): Promise<ISubscriptionDocument> {
    if (session) {
      const docs = await SubscriptionModel.create([data], { session });
      return docs[0];
    }
    return await SubscriptionModel.create(data);
  }

  async deleteById(
    id: string,
    session?: ClientSession
  ): Promise<ISubscriptionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    if (session) {
      return await SubscriptionModel.findByIdAndDelete(id, { session }).exec();
    }
    return await SubscriptionModel.findByIdAndDelete(id).exec();
  }

  async update(
    id: string,
    data: Partial<ISubscriptionDocument>,
    session?: ClientSession
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

    if (session) {
      return await SubscriptionModel.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
        session,
      }).exec();
    }

    return await SubscriptionModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async upsertByCompanyId(
    companyId: mongoose.Types.ObjectId,
    updateData: Partial<ISubscriptionDocument>,
    session?: ClientSession
  ): Promise<ISubscriptionDocument> {
    if (session) {
      return await SubscriptionModel.findOneAndUpdate(
        { companyId },
        { ...updateData, companyId, updatedAt: new Date() },
        { upsert: true, new: true, session }
      ).exec();
    }

    return await SubscriptionModel.findOneAndUpdate(
      { companyId },
      { ...updateData, companyId, updatedAt: new Date() },
      { upsert: true, new: true }
    ).exec();
  }
}
