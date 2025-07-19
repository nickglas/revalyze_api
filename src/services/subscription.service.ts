// src/services/user.service.ts
import { Service } from "typedi";
import mongoose, { Mongoose, Types } from "mongoose";
import { UserRepository } from "../repositories/user.repository";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { IUserDocument } from "../models/entities/user.entity";
import { ISubscriptionDocument } from "../models/entities/subscription.entity";

@Service()
export class SubscriptionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository
  ) {}

  /**
   * Finds a user by ID.
   *
   * @param userId - ID of the user.
   * @throws BadRequestError when User ID is missing
   * @throws NotFoundError when User not found
   * @returns The found user or throws NotFoundError.
   */
  async findById(
    userId: string | mongoose.Types.ObjectId
  ): Promise<IUserDocument> {
    if (!userId) throw new BadRequestError("User ID is required");

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    return user;
  }

  async findLatestTrialByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<ISubscriptionDocument | null> {
    return await this.subscriptionRepository.findLatestTrial({
      stripeCustomerId: stripeCustomerId,
      isTrial: true,
    });
  }
}
