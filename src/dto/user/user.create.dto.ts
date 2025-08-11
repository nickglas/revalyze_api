// src/dto/user/user.create.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";

export enum UserRoleEnum {
  EMPLOYEE = "employee",
  COMPANY_ADMIN = "company_admin",
}

class TeamDto {
  @IsMongoObjectId({
    message: "Team id must be a valid Mongo ObjectId",
  })
  @IsNotEmpty({ message: "Team id is required" })
  id!: string;

  @IsBoolean({ message: "isManager must be a boolean value" })
  @IsNotEmpty({ message: "isManager is required" })
  isManager!: boolean;
}

export class CreateUserDto {
  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsString({ message: "Name must be a string" })
  @IsNotEmpty({ message: "Name is required" })
  @Length(2, 50, { message: "Name must be between 2 and 50 characters" })
  name!: string;

  @IsEnum(UserRoleEnum, {
    message: "Role must be either 'employee' or 'company_admin'",
  })
  role!: UserRoleEnum;

  @IsBoolean({ message: "IsActive must be a boolean value" })
  @IsNotEmpty({ message: "IsActive is required" })
  isActive!: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TeamDto)
  @ArrayMinSize(1, { message: "Teams array cannot be empty if provided" })
  teams?: TeamDto[];
}
