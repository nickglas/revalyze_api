import {
  IsString,
  IsNotEmpty,
  Length,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";
import { ModelSettingsDto } from "./review.model.create.settings.dto";

class CriterionDto {
  @IsMongoObjectId({
    message: "Criterion ID must be a valid Mongo ObjectId.",
  })
  criterionId!: string;

  @IsNumber({}, { message: "Weight must be a number." })
  @Min(0, { message: "Weight must be at least 0." })
  @Max(1, { message: "Weight must be at most 1." })
  weight!: number;
}

export class CreateReviewConfigDto {
  @IsString({ message: "Name must be a string." })
  @IsNotEmpty({ message: "Name is required." })
  @Length(5, 25, {
    message: "Name must be between 5 and 25 characters.",
  })
  name!: string;

  @IsString({ message: "Description must be a string." })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: "isActive must be a boolean." })
  isActive!: boolean;

  @IsArray({ message: "Criteria must be an array." })
  @ValidateNested({ each: true })
  @Type(() => CriterionDto)
  @IsOptional()
  criteria: CriterionDto[] = [];

  // @ValidateNested()
  @Type(() => ModelSettingsDto)
  @IsOptional()
  modelSettings?: ModelSettingsDto;
}
