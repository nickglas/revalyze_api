import { validate } from "class-validator";
import { CreateCriterionDto } from "../../../dto/criterion/criterion.create.dto";

describe("CreateCriterionDto validation", () => {
  /**
   * Validates a DTO with all correct properties.
   * Expects no validation errors.
   */
  it("should validate a valid DTO", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description =
      "This description has more than thirty characters and is valid.";
    dto.isActive = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  /**
   * Fails validation when title is missing or too short (<5 characters).
   * Expects errors related to the title property.
   */
  it("should fail when title is missing or too short", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "abc";
    dto.description =
      "This description has more than thirty characters and is valid.";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "title")).toBe(true);
  });

  /**
   * Fails validation when title exceeds max length (50 characters).
   * Expects errors related to the title property.
   */
  it("should fail when title is too long", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "a".repeat(51);
    dto.description =
      "This description has more than thirty characters and is valid.";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "title")).toBe(true);
  });

  /**
   * Fails validation when title is not a string.
   * Uses a non-string type to test validation.
   */
  it("should fail when title is not a string", async () => {
    const dto = new CreateCriterionDto();
    // @ts-expect-error Testing invalid type
    dto.title = 123;
    dto.description =
      "This description has more than thirty characters and is valid.";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "title")).toBe(true);
  });

  /**
   * Fails validation when title contains only whitespace.
   * Checks if whitespace-only strings are considered invalid.
   */
  it("should fail when title is whitespace only", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "    ";
    dto.description =
      "This description has more than thirty characters and is valid.";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "title")).toBe(true);
  });

  /**
   * Fails validation when description is missing.
   * Expects errors related to the description property.
   */
  it("should fail when description is missing", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "description")).toBe(true);
  });

  /**
   * Fails validation when description is shorter than 30 characters.
   * Expects errors related to the description property.
   */
  it("should fail when description is too short", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description = "Too short";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "description")).toBe(true);
  });

  /**
   * Fails validation when description exceeds max length (200 characters).
   * Expects errors related to the description property.
   */
  it("should fail when description is too long", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description = "a".repeat(201);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "description")).toBe(true);
  });

  /**
   * Fails validation when description is not a string.
   * Uses a non-string type to test validation.
   */
  it("should fail when description is not a string", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    // @ts-expect-error Testing invalid type
    dto.description = 12345;
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "description")).toBe(true);
  });

  /**
   * Fails validation when description contains only whitespace.
   * Checks if whitespace-only strings are considered invalid.
   */
  it("should fail when description is whitespace only", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description = "    ";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "description")).toBe(true);
  });

  /**
   * Verifies that isActive defaults to true when not set explicitly.
   */
  it("should default isActive to true", () => {
    const dto = new CreateCriterionDto();
    expect(dto.isActive).toBe(true);
  });

  /**
   * Accepts isActive explicitly set to true.
   * Expects no validation errors.
   */
  it("should accept isActive as true", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description =
      "This description has more than thirty characters and is valid.";
    dto.isActive = true;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  /**
   * Accepts isActive explicitly set to false.
   * Expects no validation errors.
   */
  it("should accept isActive as false", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description =
      "This description has more than thirty characters and is valid.";
    dto.isActive = false;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  /**
   * Fails validation when isActive is not a boolean.
   * Tests with a string value.
   */
  it("should fail when isActive is not a boolean", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description =
      "This description has more than thirty characters and is valid.";
    // @ts-expect-error Testing invalid type
    dto.isActive = "true";
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "isActive")).toBe(true);
  });

  /**
   * Validates that extra, undefined properties are ignored.
   * Should not cause validation errors.
   */
  it("should ignore extra properties", async () => {
    const dto = new CreateCriterionDto();
    dto.title = "Valid Title";
    dto.description =
      "This description has more than thirty characters and is valid.";
    // @ts-expect-error Adding extra property not defined in DTO
    dto.extraProp = "something";
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
