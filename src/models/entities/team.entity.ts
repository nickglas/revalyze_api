import { Schema, model, Document, Types } from "mongoose";
import { ITeamData, ITeamUser } from "../types/team.type";
import { IUserDocument } from "./user.entity";

export interface ITeamDocument extends ITeamData, Document {
  companyId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamUserSchema = new Schema<ITeamUser>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isManager: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const teamSchema = new Schema<ITeamDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    users: [TeamUserSchema],
  },
  { timestamps: true }
);

//indexes
teamSchema.index({ companyId: 1 });
teamSchema.index({ "users.user": 1 });
teamSchema.index(
  { name: 1, companyId: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

//validation for the same user in the same team
teamSchema.path("users").validate(function (users: ITeamUser[]) {
  const userIds = users.map((u) => u.user.toString());
  return userIds.length === new Set(userIds).size;
}, "Duplicate user in team");

export const TeamModel = model<ITeamDocument>("Team", teamSchema);
