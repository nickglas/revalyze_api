import { Service } from 'typedi';
import RefreshToken from '../models/refreshToken.model';

@Service()
export class RefreshTokenRepository {
  async create(tokenData: { userId: string; token: string; expiresAt: Date }) {
    return RefreshToken.create(tokenData);
  }

  async findByToken(token: string) {
    return RefreshToken.findOne({ token });
  }

  async findOldTokens(userId: string, keepLatest: number = 5) {
    return RefreshToken.find({ userId })
      .sort({ createdAt: -1 })
      .skip(keepLatest);
  }

  async deleteManyByIds(ids: string[]) {
    return RefreshToken.deleteMany({ _id: { $in: ids } });
  }

  async deleteById(id: string) {
    return RefreshToken.deleteOne({ _id: id });
  }

  async deleteAllByUserId(userId: string) {
    return RefreshToken.deleteMany({ userId });
  }
}