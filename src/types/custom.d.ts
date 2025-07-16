// src/types/custom.ts
import { IUser } from "../../models/entities/user.entity";
import { ISubscriptionDocument } from "../../models/entities/subscription.entity";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: IUser["role"];
        email: string;
        name: string;
        companyId: string;
        userIsActive?: boolean;
        companyIsActive?: boolean;
        companySubscription?: ISubscriptionDocument;
      };
    }
  }
}
