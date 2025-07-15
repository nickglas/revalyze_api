// src/services/auth.service.ts
import { UserRepository } from "../repositories/user.repository";
import { RefreshTokenRepository } from "../repositories/refreshToken.repository";
import { generateTokens } from "../utils/token";
import jwt from "jsonwebtoken";
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from "../utils/errors";
import { Service } from "typedi";
import { CompanyRepository } from "../repositories/company.repository";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import mongoose from "mongoose";
import { ICompanyDocument } from "../models/entities/company.entity";
import { ISubscriptionDocument } from "../models/entities/subscription.entity";

@Service()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly subscriptionRepository: SubscriptionRepository
  ) {}

  async authenticateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedError("Invalid credentials");
    }
    const company = await this.getCompanyOrThrow(user.companyId);
    const subscription = await this.getSubscriptionOrThrow(company.id);

    const tokens = await generateTokens(user, company, subscription);

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const oldTokens = await this.refreshTokenRepository.findOldTokens(user.id);

    if (oldTokens.length > 0) {
      const idsToDelete = oldTokens.map((t) => t.id.toString());
      await this.refreshTokenRepository.deleteManyByIds(idsToDelete);
    }

    return tokens;
  }

  async handleRefreshToken(token: string) {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
    let decoded: { id: string };

    try {
      decoded = jwt.verify(token, jwtRefreshSecret) as { id: string };
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const storedToken = await this.refreshTokenRepository.findByToken(token);
    if (!storedToken) {
      throw new UnauthorizedError("Refresh token reuse detected or not found");
    }

    const user = await this.userRepository.findById(decoded.id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.refreshTokenRepository.deleteById(storedToken.id.toString());

    const company = await this.getCompanyOrThrow(user.companyId);
    const subscription = await this.getSubscriptionOrThrow(company.id);

    const tokens = await generateTokens(user, company, subscription);

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return tokens;
  }

  private async getCompanyOrThrow(
    companyId: string | mongoose.Types.ObjectId
  ): Promise<ICompanyDocument> {
    const company = await this.companyRepository.findOne({
      _id: companyId,
    });

    if (!company) throw new UnauthorizedError("Company for user not found");

    return company;
  }

  private async getSubscriptionOrThrow(
    companyId: string | mongoose.Types.ObjectId
  ): Promise<ISubscriptionDocument> {
    const subscription = await this.subscriptionRepository.findOne({
      companyId: companyId,
    });

    if (!subscription || subscription.status === "canceled")
      throw new UnauthorizedError("Company has no active subscription");

    return subscription;
  }

  async logoutAllDevices(userId: string) {
    if (!userId) {
      throw new BadRequestError("User ID is required");
    }
    await this.refreshTokenRepository.deleteAllByUserId(userId);
  }
}
