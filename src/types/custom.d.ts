import { IUser } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: IUser['role'];
        email: string;
        name: string;
        companyId: string
      };
    }
  }
}