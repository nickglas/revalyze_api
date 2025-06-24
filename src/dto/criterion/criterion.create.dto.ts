import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  Length,
  IsOptional,
  isNotEmpty,
} from "class-validator";

export class CreateCriterionDto {
  @IsString({ message: "Title must be a string." })
  @IsNotEmpty({ message: "Title is required." })
  @Length(5, 50, { message: "Title must be between 5 and 50 characters." })
  title!: string;

  @IsString({ message: "Description must be a string." })
  @IsNotEmpty({ message: "Description is required." })
  @Length(30, 200, {
    message: "Description must be between 30 and 200 characters.",
  })
  description!: string;

  @IsBoolean({ message: "isActive must be a boolean value." })
  @IsOptional()
  isActive: boolean = true;
}
