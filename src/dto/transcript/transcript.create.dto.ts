import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsMongoId,
  IsOptional,
} from "class-validator";
import { IsMongoObjectId } from "../../validators/mongo.objectId.validator";

export class CreateTranscriptDto {
  @IsOptional()
  @IsMongoObjectId({
    message: "External Company ID must be a valid Mongo ObjectId",
  })
  externalCompanyId!: string;

  @IsOptional()
  @IsMongoObjectId({ message: "Contact ID must be a valid Mongo ObjectId" })
  contactId!: string;

  @IsNotEmpty({ message: "Transcript content is required" })
  @IsString({ message: "Transcript content must be a string" })
  content!: string;

  @IsNotEmpty({ message: "Timestamp is required" })
  @IsDateString({}, { message: "Timestamp must be a valid ISO date string" })
  timestamp!: string;

  @IsOptional()
  @IsMongoObjectId({
    message: "EmployeeId ID must be a valid Mongo ObjectId",
  })
  employeeId!: string;
}
