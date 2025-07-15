import {
  IsString,
  Length,
  IsArray,
  IsOptional,
  ArrayUnique,
  ValidateNested,
  IsBoolean,
  Validate,
} from "class-validator";
import { Type } from "class-transformer";
import { UpdateModelSettingsDto } from "./review.model.update.settings.dto";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";

export class UpdateReviewConfigDto {
  @IsString({ message: "Name must be a string." })
  @Length(3, 25, { message: "Name must be between 3 and 25 characters." })
  @IsOptional()
  name?: string;

  @IsArray({ message: "criteriaIds must be an array." })
  @ArrayUnique({ message: "criteriaIds must not contain duplicates." })
  @IsOptional()
  @IsMongoObjectId({ each: true })
  criteriaIds?: string[];

  @ValidateNested({ message: "modelSettings must be a valid object." })
  @Type(() => UpdateModelSettingsDto)
  @IsOptional()
  modelSettings?: UpdateModelSettingsDto;

  @IsBoolean({ message: "isActive must be a boolean." })
  @IsOptional()
  isActive?: boolean;
}
