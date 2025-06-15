// src/services/auth.service.ts
import refreshTokenModel from '../models/refreshToken.model';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import User from '../models/user.model';
import { generateTokens } from '../utils/token';
import jwt from 'jsonwebtoken';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from '../utils/errors';
import { Service } from 'typedi';

@Service()
export class AuthService{

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  async authenticateUser(email: string, password: string){

    const user = await this.userRepository.findByEmail(email);

    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = generateTokens(user);

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const oldTokens = await this.refreshTokenRepository.findOldTokens(user.id);

    if (oldTokens.length > 0) {
      const idsToDelete = oldTokens.map(t => t._id.toString());
      await this.refreshTokenRepository.deleteManyByIds(idsToDelete);
    }

    return tokens;
  };

  async handleRefreshToken(token: string){
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
    let decoded: { id: string };

    try {
      decoded = jwt.verify(token, jwtRefreshSecret) as { id: string };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const storedToken = await this.refreshTokenRepository.findByToken(token);
    if (!storedToken) {
      throw new UnauthorizedError('Refresh token reuse detected or not found');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.refreshTokenRepository.deleteById(storedToken._id.toString());

    const tokens = generateTokens(user);

    await this.refreshTokenRepository.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return tokens;
  };

  async logoutAllDevices(userId: string){
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }
    await this.refreshTokenRepository.deleteAllByUserId(userId);
  };

}
