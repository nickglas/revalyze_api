// src/dto/contact/contact.update.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  minLength,
} from "class-validator";

export class UpdateContactDto {
  @IsString({ message: "First name must be a string" })
  @IsOptional()
  @Length(2, 30, { message: "First name must be between 2 and 30 characters" })
  firstName?: string;

  @IsString({ message: "Last name must be a string" })
  @IsOptional()
  @Length(2, 30, { message: "Last name must be between 2 and 30 characters" })
  lastName?: string;

  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsOptional()
  email?: string;

  @IsString({ message: "Phone must be a string" })
  @IsOptional()
  phone?: string;

  @IsString({ message: "Position must be a string" })
  @IsOptional()
  @MaxLength(50, { message: "Position must be at most 50 characters long" })
  position?: string;

  @IsString({ message: "externalCompanyId must be a string" })
  @IsOptional()
  externalCompanyId?: string;

  @IsBoolean({ message: "isActive must be a boolean." })
  @IsOptional()
  isActive?: boolean;
}
