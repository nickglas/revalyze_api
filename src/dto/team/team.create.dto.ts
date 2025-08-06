// src/dto/team/team.create.dto.ts
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";

export class CreateTeamUserDto {
  @IsMongoObjectId({
    message: "User ID must be a valid Mongo ObjectId",
  })
  @IsNotEmpty({ message: "User ID is required" })
  userId!: string;

  @IsBoolean({ message: "isManager must be a boolean" })
  @IsOptional()
  isManager?: boolean = false;
}

export class CreateTeamDto {
  @IsString({ message: "Name must be a string" })
  @IsNotEmpty({ message: "Name is required" })
  name!: string;

  @IsString({ message: "Description must be a string" })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: "isActive must be a boolean" })
  @IsOptional()
  isActive?: boolean = true;

  @IsArray({ message: "Users must be an array" })
  @ValidateNested({ each: true })
  @Type(() => CreateTeamUserDto)
  users!: CreateTeamUserDto[];
}
