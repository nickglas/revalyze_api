// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if (
      typeof decoded === 'object' &&
      'id' in decoded &&
      'name' in decoded &&
      'email' in decoded &&
      'role' in decoded &&
      'companyId' in decoded
    ) {
      req.user = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId
      };
      next();
    } else {
      res.status(401).json({ message: 'Invalid token payload' });
    }
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
