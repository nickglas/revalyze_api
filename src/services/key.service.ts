import { Service } from "typedi";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { CompanyRepository } from "../repositories/company.repository";
import { BadRequestError, NotFoundError } from "../utils/errors";

@Service()
export class ApiKeyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private async hashApiKey(apiKey: string): Promise<string> {
    return bcrypt.hash(apiKey, 10);
  }

  /**
   * Regenerates an API key for a company (or generates one if not set)
   * @param companyId string
   * @returns The new raw API key (shown only once)
   */
  async regenerateApiKey(companyId: string): Promise<string> {
    if (!companyId) throw new BadRequestError("No company ID provided");

    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new NotFoundError("Company not found");

    const rawApiKey = this.generateApiKey();
    const hashedApiKey = await this.hashApiKey(rawApiKey);

    company.hashedApiKey = hashedApiKey;
    company.apiKeyCreatedAt = new Date();

    await this.companyRepository.update(company.id, company);

    return rawApiKey;
  }

  /**
   * Verifies an API key against a company
   * @param companyId string
   * @param providedKey string
   */
  async verifyApiKey(companyId: string, providedKey: string): Promise<boolean> {
    const company = await this.companyRepository.findById(companyId);
    if (!company || !company.hashedApiKey) return false;

    return bcrypt.compare(providedKey, company.hashedApiKey);
  }
}
