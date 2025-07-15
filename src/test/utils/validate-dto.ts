// test/utils/validate-dto.ts
import { validate } from "class-validator";

export async function validateDto(dto: object) {
  const errors = await validate(dto);
  return errors.map((e) => ({
    property: e.property,
    constraints: e.constraints,
  }));
}
