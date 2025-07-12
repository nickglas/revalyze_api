// src/repositories/refresh.token.repository.ts
import { Service } from "typedi";
import {
  RefreshTokenModel,
  IRefreshTokenDocument,
} from "../models/entities/refresh.token.entity";
import mongoose from "mongoose";

@Service()
export class RefreshTokenRepository {
  async create(tokenData: {
    userId: string | mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    ip?: string;
    userAgent?: string;
  }): Promise<IRefreshTokenDocument> {
    return await RefreshTokenModel.create(tokenData);
  }

  async findByToken(token: string): Promise<IRefreshTokenDocument | null> {
    return await RefreshTokenModel.findOne({ token }).exec();
  }

  async findOldTokens(
    userId: string | mongoose.Types.ObjectId,
    keepLatest: number = 5
  ): Promise<IRefreshTokenDocument[]> {
    return await RefreshTokenModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(keepLatest)
      .exec();
  }

  async deleteManyByIds(ids: (string | mongoose.Types.ObjectId)[]) {
    return await RefreshTokenModel.deleteMany({ _id: { $in: ids } }).exec();
  }

  async deleteById(id: string | mongoose.Types.ObjectId) {
    return await RefreshTokenModel.deleteOne({ _id: id }).exec();
  }

  async deleteAllByUserId(userId: string | mongoose.Types.ObjectId) {
    return await RefreshTokenModel.deleteMany({ userId }).exec();
  }
}
