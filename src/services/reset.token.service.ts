// services/plan.service.ts
import { IPlanDocument, PlanModel } from "../models/entities/plan.entity";
import { Service } from "typedi";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { ResetTokenRepository } from "../repositories/reset.token.repository";
import { IResetTokenDocument } from "../models/entities/reset.token.entity";
import { logger } from "../utils/logger";
import crypto from "crypto";
import bcrypt from "bcryptjs";

@Service()
export class ResetTokenService {
  constructor(private readonly resetTokenRepository: ResetTokenRepository) {}

  async getTokenById(tokenId: string): Promise<IResetTokenDocument | null> {
    const token = await this.resetTokenRepository.findValidByToken(tokenId);

    if (!token || token.expiresAt.getTime() < Date.now()) {
      logger.warn(`Reset token not found or already used: ${tokenId}`);
      return null;
    }

    return token;
  }
}
