// dtos/register-company.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from "class-validator";
import { Match } from "../../utils/match.decorator";

export class RegisterCompanyDto {
  @IsNotEmpty({ message: "Company name is required" })
  @IsString({ message: "Company name must be a string" })
  @MinLength(3, { message: "Company name must be at least 3 characters long" })
  @MaxLength(20, { message: "Company name must be at most 20 characters long" })
  companyName!: string;

  @IsNotEmpty({ message: "Company email is required" })
  @IsEmail({}, { message: "Company email must be a valid email address" })
  @MinLength(3, { message: "Company email must be at least 3 characters long" })
  @MaxLength(30, {
    message: "Company email must be at most 30 characters long",
  })
  companyMainEmail!: string;

  @IsNotEmpty({ message: "Company phone is required" })
  @IsString({ message: "Company phone must be a string" })
  @MinLength(3, { message: "Company phone must be at least 3 characters long" })
  @MaxLength(20, {
    message: "Company phone must be at most 10 characters long",
  })
  @Matches(/^\+\d{1,3}\d{4,}$/, {
    message:
      "Phone number must include land code and only digits, e.g., +3112345678",
  })
  companyPhone!: string;

  @IsNotEmpty({ message: "Address is required" })
  @IsString({ message: "Address must be a string" })
  @MinLength(3, { message: "Address must be at least 3 characters long" })
  @MaxLength(30, { message: "Address must be at most 30 characters long" })
  address!: string;

  @IsNotEmpty({ message: "Subscription plan ID is required" })
  @IsString({ message: "Subscription plan ID must be a string" })
  subscriptionPlanId!: string;

  @IsNotEmpty({ message: "Admin name is required" })
  @IsString({ message: "Admin name must be a string" })
  @MinLength(3, { message: "Admin name must be at least 3 characters long" })
  @MaxLength(20, { message: "Admin name must be at most 20 characters long" })
  adminName!: string;

  @IsNotEmpty({ message: "Admin email is required" })
  @IsEmail({}, { message: "Admin email must be a valid email address" })
  @MinLength(3, { message: "Admin email must be at least 3 characters long" })
  @MaxLength(30, { message: "Admin email must be at most 30 characters long" })
  adminEmail!: string;

  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: "Password must include upper, lower, number and special character",
  })
  password!: string;

  @IsNotEmpty({ message: "Password confirmation is required" })
  @Match("password", { message: "Passwords do not match" })
  passwordConfirm!: string;
}
