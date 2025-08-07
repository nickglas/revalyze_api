import mongoose, { ObjectId, Types } from "mongoose";

export interface ITeamUser {
  user: Types.ObjectId;
  isManager: boolean;
}

export interface ITeamData {
  name: string;
  description?: string;
  isActive: boolean;
  companyId: Types.ObjectId;
  users: ITeamUser[];
}
