import {
  IsString,
  IsNotEmpty,
  Length,
  IsArray,
  IsOptional,
  ArrayUnique,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ModelSettingsDto } from "./review.model.settings.dto";

export class CreateReviewConfigDto {
  @IsString({ message: "Name must be a string." })
  @IsNotEmpty({ message: "Name is required." })
  @Length(3, 25, { message: "Name must be between 3 and 25 characters." })
  name!: string;

  @IsArray({ message: "criteriaIds must be an array." })
  @ArrayUnique({ message: "criteriaIds must not contain duplicates." })
  @IsOptional()
  criteriaIds: string[] = [];

  @ValidateNested()
  @Type(() => ModelSettingsDto)
  @IsOptional()
  modelSettings?: ModelSettingsDto;
}
