import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsIn,
  IsArray,
  IsNumber,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

class CriteriaWeightDto {
  @IsMongoId()
  criterionId!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  weight!: number;
}

/**
 * DTO used for creating a Review.
 * - Only requires the transcriptId, reviewConfigId, and type.
 * - Other fields (employeeId, externalCompanyId, clientId, etc.) are derived from the Transcript.
 */
export class CreateReviewDto {
  @IsMongoId({ message: "transcriptId must be a valid MongoDB ObjectId." })
  @IsNotEmpty({ message: "transcriptId is required." })
  transcriptId!: string;

  @IsMongoId({ message: "reviewConfigId must be a valid MongoDB ObjectId." })
  @IsNotEmpty({ message: "reviewConfigId is required." })
  reviewConfigId!: string;

  @IsString({ message: "type must be a string." })
  @IsIn(["performance", "sentiment", "both"], {
    message: "type must be one of: performance, sentiment, or both.",
  })
  type!: "performance" | "sentiment" | "both";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaWeightDto)
  criteriaWeights?: CriteriaWeightDto[];
}
