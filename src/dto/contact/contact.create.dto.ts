// src/dto/contact/contact.create.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";

export class CreateContactDto {
  @IsMongoObjectId({
    message: "externalCompanyId must be a valid Mongo ObjectId",
  })
  externalCompanyId!: string;

  @IsString({ message: "First name must be a string" })
  @IsNotEmpty({ message: "First name is required" })
  @Length(2, 30, { message: "First name must be between 2 and 30 characters" })
  firstName!: string;

  @IsString({ message: "Last name must be a string" })
  @IsNotEmpty({ message: "Last name is required" })
  @Length(2, 30, { message: "Last name must be between 2 and 30 characters" })
  lastName!: string;

  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsString({ message: "Phone must be a string" })
  @IsOptional()
  phone?: string;

  @IsString({ message: "Position must be a string" })
  @IsOptional()
  @MaxLength(50, { message: "Position must be at most 50 characters long" })
  position?: string;

  @IsBoolean({ message: "isActive must be a boolean." })
  @IsOptional()
  isActive?: boolean;
}
