// src/dto/user/user.update.dto.ts
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

export class UpdateUserDto {
  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsOptional()
  email?: string;

  @IsString({ message: "Name must be a string" })
  @IsOptional()
  @Length(2, 50, { message: "Name must be between 2 and 50 characters" })
  name?: string;
}
