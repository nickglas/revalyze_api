import { IsOptional, IsNumber, IsString, IsIn } from "class-validator";

export class UpdateReviewDto {
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsNumber()
  overallScore?: number;

  @IsOptional()
  @IsNumber()
  sentimentScore?: number;

  @IsOptional()
  @IsIn(["performance", "sentiment", "both"])
  type?: "performance" | "sentiment" | "both";

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  overallFeedback?: string;
}
