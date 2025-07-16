// src/repositories/reset-token.repository.ts
import { Service } from "typedi";
import mongoose, { FilterQuery, Types } from "mongoose";
import {
  ResetTokenModel,
  IResetTokenDocument,
} from "../models/entities/reset.token.entity";

@Service()
export class ResetTokenRepository {
  async create(
    data: Partial<IResetTokenDocument>
  ): Promise<IResetTokenDocument> {
    return await ResetTokenModel.create(data);
  }

  async findValidByToken(
    rawToken: string
  ): Promise<IResetTokenDocument | null> {
    const allTokens = await ResetTokenModel.find({
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).exec();

    for (const tokenDoc of allTokens) {
      const match = await import("bcrypt").then((bcrypt) =>
        bcrypt.compare(rawToken, tokenDoc.tokenHash)
      );
      if (match) return tokenDoc;
    }

    return null;
  }

  async markUsed(id: string): Promise<void> {
    await ResetTokenModel.findByIdAndUpdate(id, { usedAt: new Date() }).exec();
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await ResetTokenModel.deleteMany({ userId }).exec();
  }

  async findByUserId(userId: string): Promise<IResetTokenDocument[]> {
    return await ResetTokenModel.find({ userId }).exec();
  }
}
