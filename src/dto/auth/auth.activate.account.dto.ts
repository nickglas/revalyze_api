// src/dto/auth/auth.activate.account.dto.ts
import { IsString, MinLength } from "class-validator";

export class ActivateAccountDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
