import { IsEmail, IsNotEmpty } from "class-validator";

export class RequestResetPasswordDto {
  @IsEmail({}, { message: "Email must be a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;
}
