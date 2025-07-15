import {
  IsString,
  IsIn,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class UpdateModelSettingsDto {
  @IsString({ message: "Model must be a string." })
  @IsIn(["gpt-3.5-turbo", "gpt-4", "gpt-4o"], {
    message: "Model must be one of: gpt-3.5-turbo, gpt-4, gpt-4o.",
  })
  @IsOptional()
  model?: string;

  @IsNumber({}, { message: "Temperature must be a number." })
  @Min(0.1, { message: "Temperature must be at least 0.1." })
  @Max(1, { message: "Temperature cannot be greater than 1." })
  @IsOptional()
  temperature?: number;

  @IsNumber({}, { message: "maxTokens must be a number." })
  @Min(1, { message: "maxTokens must be at least 1." })
  @Max(32768, { message: "maxTokens cannot exceed 32768." })
  @IsOptional()
  maxTokens?: number;

  @IsNumber({}, { message: "top_p must be a number." })
  @Min(0, { message: "top_p cannot be less than 0." })
  @Max(1, { message: "top_p cannot be greater than 1." })
  @IsOptional()
  top_p?: number;
}
