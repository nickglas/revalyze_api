import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
} from "class-validator";

export class CreateExternalCompanyDto {
  @IsNotEmpty({ message: "Company name is required." })
  @IsString({ message: "Company name must be a string." })
  @MinLength(3, { message: "Company name must be at least 3 characters long." })
  @MaxLength(50, {
    message: "Company name must be at most 50 characters long.",
  })
  name!: string;

  @IsNotEmpty({ message: "Company email is required." })
  @IsEmail({}, { message: "Company email must be a valid email address." })
  @MaxLength(100, {
    message: "Company email must be at most 100 characters long.",
  })
  email!: string;

  @IsNotEmpty({ message: "Company phone is required." })
  @IsString({ message: "Company phone must be a string." })
  @MinLength(7, {
    message: "Company phone must be at least 7 characters long.",
  })
  @MaxLength(20, {
    message: "Company phone must be at most 20 characters long.",
  })
  @Matches(/^\+\d{1,3}\d{4,}$/, {
    message:
      "Phone number must start with '+' followed by country code and digits, e.g. +31123456789",
  })
  phone!: string;

  @IsNotEmpty({ message: "Address is required." })
  @IsString({ message: "Address must be a string." })
  @MinLength(5, { message: "Address must be at least 5 characters long." })
  @MaxLength(200, { message: "Address must be at most 200 characters long." })
  address!: string;

  @IsBoolean({ message: "isActive must be a boolean." })
  @IsOptional()
  isActive?: boolean;
}
