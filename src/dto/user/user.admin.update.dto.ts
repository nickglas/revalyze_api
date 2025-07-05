// src/dto/user/user.admin.update.dto.ts
import { IsEmail, IsOptional, IsString, Length, IsEnum } from "class-validator";

export enum UserRole {
  EMPLOYEE = "employee",
  COMPANY_ADMIN = "company_admin",
}

export class AdminUpdateUserDto {
  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsOptional()
  email?: string;

  @IsString({ message: "Name must be a string" })
  @IsOptional()
  @Length(2, 50, { message: "Name must be between 2 and 50 characters" })
  name?: string;

  @IsEnum(UserRole, { message: "Role must be a valid role" })
  @IsOptional()
  role?: UserRole;
}
