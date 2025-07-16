import { IsNotEmpty, MinLength, Matches, IsString } from "class-validator";
import { Match } from "../../utils/match.decorator";

export class ResetPasswordDto {
  @IsString({ message: "Token must be a string" })
  @IsNotEmpty({ message: "Reset token is required" })
  token!: string;

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
