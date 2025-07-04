import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  Max,
} from "class-validator";

export class ModelSettingsDto {
  @IsString({ message: "Model must be a string." })
  @IsIn(["gpt-3.5-turbo", "gpt-4", "gpt-4o"], {
    message: "Model must be one of: gpt-3.5-turbo, gpt-4, or gpt-4o.",
  })
  model!: string;

  @IsNumber({}, { message: "Temperature must be a number." })
  @Min(0.1, { message: "Temperature must be at least 0.1." })
  @Max(1, { message: "Temperature must be at most 1." })
  @IsOptional()
  temperature?: number;

  @IsNumber({}, { message: "maxTokens must be a number." })
  @Min(1, { message: "maxTokens must be at least 1." })
  @Max(32768, { message: "maxTokens must be at most 32768." })
  @IsOptional()
  maxTokens?: number;

  @IsNumber({}, { message: "top_p must be a number." })
  @Min(0, { message: "top_p must be at least 0." })
  @Max(1, { message: "top_p must be at most 1." })
  @IsOptional()
  top_p?: number;
}
