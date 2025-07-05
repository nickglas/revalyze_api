// src/dto/user/user.create.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from "class-validator";

export enum UserRoleEnum {
  EMPLOYEE = "employee",
  COMPANY_ADMIN = "company_admin",
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
}
