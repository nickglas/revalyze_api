// middleware/validate.ts
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Request, Response, NextFunction } from "express";

function flattenErrors(
  errors: ValidationError[],
  parentPath = ""
): { field: string; constraints: any }[] {
  let result: { field: string; constraints: any }[] = [];

  for (const err of errors) {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;

    if (err.constraints) {
      result.push({
        field: path,
        constraints: err.constraints,
      });
    }

    if (err.children && err.children.length > 0) {
      result = result.concat(flattenErrors(err.children, path));
    }
  }

  return result;
}

export function validateDto(dtoClass: any) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const dtoObj = plainToInstance(dtoClass, req.body);
    const errors = await validate(dtoObj, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      res.status(400).json({
        message: "Validation failed",
        errors: flattenErrors(errors),
      });
      return;
    }

    req.body = dtoObj;
    next();
  };
}
