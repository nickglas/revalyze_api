import { Service } from "typedi";
import RefreshToken from "../models/refreshToken.model";

@Service()
export class RefreshTokenRepository {
  async create(tokenData: { userId: string; token: string; expiresAt: Date }) {
    return await RefreshToken.create(tokenData);
  }

  async findByToken(token: string) {
    return await RefreshToken.findOne({ token }).exec();
  }

  async findOldTokens(userId: string, keepLatest: number = 5) {
    return await RefreshToken.find({ userId })
      .sort({ createdAt: -1 })
      .skip(keepLatest)
      .exec();
  }

  async deleteManyByIds(ids: string[]) {
    return await RefreshToken.deleteMany({ _id: { $in: ids } }).exec();
  }

  async deleteById(id: string) {
    return await RefreshToken.deleteOne({ _id: id }).exec();
  }

  async deleteAllByUserId(userId: string) {
    return await RefreshToken.deleteMany({ userId }).exec();
  }
}
