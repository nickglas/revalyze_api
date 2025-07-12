// test/unit/dtos/register-company.dto.spec.ts
import { RegisterCompanyDto } from "../../dto/company/register.company.dto";
import { validateDto } from "../utils/validate-dto";

describe("RegisterCompanyDto", () => {
  const validDto: RegisterCompanyDto = {
    companyName: "AcmeCorp",
    companyMainEmail: "info@acme.com",
    companyPhone: "+3112345678",
    address: "Main Street 123",
    subscriptionPlanId: "plan_abc123",
    adminName: "John Doe",
    adminEmail: "john@acme.com",
    password: "Str0ng@Pass!",
    passwordConfirm: "Str0ng@Pass!",
  };

  it("should pass validation with valid data", async () => {
    const errors = await validateDto(
      Object.assign(new RegisterCompanyDto(), validDto)
    );
    expect(errors).toHaveLength(0);
  });

  it("should fail if required fields are missing", async () => {
    const dto = new RegisterCompanyDto();
    const errors = await validateDto(dto);

    const fieldsWithErrors = errors.map((e) => e.property);
    expect(fieldsWithErrors).toEqual(
      expect.arrayContaining([
        "companyName",
        "companyMainEmail",
        "companyPhone",
        "address",
        "subscriptionPlanId",
        "adminName",
        "adminEmail",
        "password",
        "passwordConfirm",
      ])
    );
  });

  it("should fail if companyPhone format is invalid", async () => {
    const dto = { ...validDto, companyPhone: "0612345678" };
    const errors = await validateDto(
      Object.assign(new RegisterCompanyDto(), dto)
    );

    expect(errors.some((e) => e.property === "companyPhone")).toBe(true);
  });

  it("should fail if emails are invalid", async () => {
    const dto = {
      ...validDto,
      companyMainEmail: "bad",
      adminEmail: "also-bad",
    };
    const errors = await validateDto(
      Object.assign(new RegisterCompanyDto(), dto)
    );

    expect(errors.some((e) => e.property === "companyMainEmail")).toBe(true);
    expect(errors.some((e) => e.property === "adminEmail")).toBe(true);
  });

  it("should fail if companyName or adminName is too short/long", async () => {
    const dto = { ...validDto, companyName: "a", adminName: "a".repeat(50) };
    const errors = await validateDto(
      Object.assign(new RegisterCompanyDto(), dto)
    );

    expect(errors.some((e) => e.property === "companyName")).toBe(true);
    expect(errors.some((e) => e.property === "adminName")).toBe(true);
  });

  it("should fail if password does not meet requirements", async () => {
    const dto = {
      ...validDto,
      password: "weakpass",
      passwordConfirm: "weakpass",
    };
    const errors = await validateDto(
      Object.assign(new RegisterCompanyDto(), dto)
    );

    expect(errors.some((e) => e.property === "password")).toBe(true);
  });

  it("should fail if passwords do not match", async () => {
    const dto = { ...validDto, passwordConfirm: "Mismatch123!" };
    const errors = await validateDto(
      Object.assign(new RegisterCompanyDto(), dto)
    );

    expect(errors.some((e) => e.property === "passwordConfirm")).toBe(true);
  });
});
