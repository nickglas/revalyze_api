// src/dto/company/update.company.dto.ts
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
} from "class-validator";

export class UpdateCompanyDto {
  @IsString({ message: "Name must be a string" })
  @IsNotEmpty({ message: "Name is required" })
  @MinLength(5, { message: "Name must be at least 5 characters" })
  @MaxLength(50, { message: "Name cannot exceed 50 characters" })
  name!: string;

  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  @MinLength(5, { message: "Email must be at least 5 characters" })
  @MaxLength(50, { message: "Email cannot exceed 50 characters" })
  email!: string;

  @IsString({ message: "Phone must be a string" })
  @IsNotEmpty({ message: "Phone is required" })
  @MinLength(5, { message: "Phone must be at least 5 characters" })
  @MaxLength(50, { message: "Phone cannot exceed 50 characters" })
  phone!: string;

  @IsString({ message: "Address must be a string" })
  @IsNotEmpty({ message: "Address is required" })
  @MinLength(5, { message: "Address must be at least 5 characters" })
  @MaxLength(50, { message: "Address cannot exceed 50 characters" })
  address!: string;
}
