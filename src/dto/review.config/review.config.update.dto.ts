import {
  IsString,
  IsOptional,
  Length,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";

class CriterionUpdateDto {
  @IsMongoObjectId({ message: "Criterion ID must be a valid Mongo ObjectId" })
  criterionId!: string;

  @IsNumber({}, { message: "Weight must be a number" })
  @Min(0, { message: "Weight must be at least 0" })
  @Max(1, { message: "Weight must be at most 1" })
  weight!: number;
}

class ModelSettingsDto {
  @IsNumber({}, { message: "Temperature must be a number" })
  @Min(0, { message: "Temperature must be at least 0" })
  @Max(2, { message: "Temperature cannot exceed 2" })
  @IsOptional()
  temperature?: number;

  @IsNumber({}, { message: "Max tokens must be a number" })
  @Min(1, { message: "Max tokens must be at least 1" })
  @Max(4000, { message: "Max tokens cannot exceed 4000" })
  @IsOptional()
  maxTokens?: number;
}

export class UpdateReviewConfigDto {
  @IsString({ message: "Name must be a string" })
  @Length(3, 50, { message: "Name must be between 3 and 50 characters" })
  @IsOptional()
  name?: string;

  @IsString({ message: "Description must be a string" })
  @Length(0, 500, { message: "Description cannot exceed 500 characters" })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: "isActive must be a boolean" })
  @IsOptional()
  isActive?: boolean;

  @IsArray({ message: "Criteria must be an array" })
  @ValidateNested({ each: true })
  @Type(() => CriterionUpdateDto)
  @IsOptional()
  criteria?: CriterionUpdateDto[];

  @ValidateNested()
  @Type(() => ModelSettingsDto)
  @IsOptional()
  modelSettings?: ModelSettingsDto;
}
