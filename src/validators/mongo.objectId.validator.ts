import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import mongoose from "mongoose";

@ValidatorConstraint({ async: false })
export class IsMongoObjectIdConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
  }

  defaultMessage(_args: ValidationArguments) {
    return "Each criteriaId must be a valid 24-character hex Mongo ObjectId string";
  }
}

export function IsMongoObjectId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMongoObjectIdConstraint,
    });
  };
}
