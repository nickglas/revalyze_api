import jwt from 'jsonwebtoken';
import { IUser } from '../models/user.model';

export const generateTokens = (user: IUser) => {

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not defined');
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    jwtSecret!,
    { expiresIn: '15m' }
  );

  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET not defined');
  const refreshToken = jwt.sign(
    { id: user._id },
    jwtRefreshSecret!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};