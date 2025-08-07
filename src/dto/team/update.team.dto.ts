import mongoose, { Types } from "mongoose";

export interface UpdateTeamUserDTO {
  userId: string;
  isManager: boolean;
}

export interface UpdateTeamDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
  users?: UpdateTeamUserDTO[];
}

export interface UpdateTeamServiceDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
  users?: {
    user: Types.ObjectId;
    isManager: boolean;
  }[];
}
