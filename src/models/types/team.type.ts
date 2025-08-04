import mongoose from "mongoose";

export interface ITeamUser {
  user: string | mongoose.Types.ObjectId;
  isManager: boolean;
}

export interface ITeamData {
  name: string;
  description?: string;
  isActive: boolean;
  companyId: string | mongoose.Types.ObjectId;
  users: ITeamUser[];
}
