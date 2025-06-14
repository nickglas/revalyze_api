// src/services/auth.service.ts
import refreshTokenModel from '../models/refreshToken.model';
import User from '../models/user.model';
import { generateTokens } from '../utils/token';
import jwt from 'jsonwebtoken';

export const authenticateUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid credentials');
  }

  const tokens = generateTokens(user);

  // Save the new refresh token
  await refreshTokenModel.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Find refresh tokens beyond the 5 most recent and delete them
  const oldTokens = await refreshTokenModel.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .skip(5);

  if (oldTokens.length > 0) {
    const idsToDelete = oldTokens.map(t => t._id);
    await refreshTokenModel.deleteMany({ _id: { $in: idsToDelete } });
  }

  return tokens;
};


export const handleRefreshToken = async (token: string) => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
  let decoded: { id: string };

  try {
    decoded = jwt.verify(token, jwtRefreshSecret) as { id: string };
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const storedToken = await refreshTokenModel.findOne({ token });
  if (!storedToken) {
    throw new Error('Refresh token reuse detected or not found');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new Error('User not found');

  // Invalidate old refresh token
  await refreshTokenModel.deleteOne({ _id: storedToken._id });

  // Generate new tokens
  const tokens = generateTokens(user);

  // Save the new refresh token
  await refreshTokenModel.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return tokens;
};


export const logoutAllDevices = async (userId: string) => {
  await refreshTokenModel.deleteMany({ userId });
};
