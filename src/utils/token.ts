import jwt from 'jsonwebtoken';
import { IUser } from '../models/user.model';

export const generateTokens = (user: IUser) => {

  const accessToken = jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name, companyId: user.companyId.toString() },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};