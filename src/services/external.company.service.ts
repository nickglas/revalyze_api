import { Service } from "typedi";
import mongoose, { mongo, ObjectId } from "mongoose";
import { CreateExternalCompanyDto } from "../dto/external.company/external.company.create.dto";
import {
  IExternalCompanyDocument,
  ExternalCompanyModel,
} from "../models/entities/external.company.entity";
import { ExternalCompanyRepository } from "../repositories/external.company.repository";
import { BadRequestError, NotFoundError } from "../utils/errors";

@Service()
export class ExternalCompanyService {
  constructor(
    private readonly externalCompanyRepository: ExternalCompanyRepository
  ) {}

  /**
   * Get paginated external companies optionally filtered by name, isActive, and createdAfter.
   * @throws BadRequestError if company id is missing.
   */
  async getExternalCompanies(
    companyId: mongoose.Types.ObjectId,
    name?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20
  ): Promise<{ companies: IExternalCompanyDocument[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.externalCompanyRepository.findByFilters(
      companyId,
      name,
      isActive,
      createdAfter,
      page,
      limit
    );
  }

  /**
   * Get external company by ID.
   * @throws BadRequestError if id is missing.
   * @throws BadRequestError if companyId is missing.
   * @throws NotFoundError if no company found.
   */
  async getById(
    id: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId
  ): Promise<IExternalCompanyDocument> {
    if (!id) throw new BadRequestError("No external company id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const company = await this.externalCompanyRepository.findOne({
      companyId: companyId,
      _id: id,
    });

    if (!company)
      throw new NotFoundError(`External company with id ${id} not found`);

    return company;
  }

  /**
   * Creates a new external company associated with a given company.
   *
   * Performs uniqueness checks for email, phone, and address before creation.
   * Associates the external company with the specified Revalyze company via `companyId`.
   *
   * @param dto - The data transfer object containing external company details.
   * @param companyId - The ObjectId of the Revalyze company creating this external company.
   *
   * @returns Promise resolving to the created external company document.
   *
   * @throws BadRequestError if:
   * - `companyId` is not provided
   * - the email is already in use
   * - the phone number is already in use
   * - the address is already in use
   */
  async createExternalCompany(
    dto: CreateExternalCompanyDto,
    companyId: mongoose.Types.ObjectId
  ): Promise<IExternalCompanyDocument> {
    if (!companyId) throw new BadRequestError("No company id specified");

    const existingEmail = await this.externalCompanyRepository.findOne({
      email: dto.email,
    });
    if (existingEmail) throw new BadRequestError("Email already in use");

    const existingPhone = await this.externalCompanyRepository.findOne({
      phone: dto.phone,
    });
    if (existingPhone) throw new BadRequestError("Phone number already in use");

    const existingAddress = await this.externalCompanyRepository.findOne({
      address: dto.address,
    });
    if (existingAddress) throw new BadRequestError("Address already in use");

    const company = new ExternalCompanyModel({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      isActive: dto.isActive ?? true,
      companyId,
    });

    return this.externalCompanyRepository.create(company);
  }

  /**
   * Updates an existing external company owned by the given company.
   *
   * Ensures the external company belongs to the authenticated company.
   * Performs uniqueness checks for updated email, phone, and address.
   *
   * @param companyId - The ObjectId of the Revalyze company.
   * @param externalCompanyId - The ObjectId of the external company to update.
   * @param updates - Partial fields to update (e.g. name, email, phone).
   *
   * @returns Promise resolving to the updated external company document.
   *
   * @throws BadRequestError if:
   * - `companyId` is not provided
   * - `externalCompanyId` is not provided
   * - the new email is already in use by another external company
   * - the new phone is already in use by another external company
   * - the new address is already in use by another external company
   *
   * @throws NotFoundError if:
   * - the external company is not found or doesn't belong to the given company
   */
  async updateExternalCompany(
    companyId: mongoose.Types.ObjectId,
    externalCompanyId: mongoose.Types.ObjectId,
    updates: Partial<IExternalCompanyDocument>
  ): Promise<IExternalCompanyDocument | null> {
    if (!companyId) throw new BadRequestError("No company id specified");
    if (!externalCompanyId)
      throw new BadRequestError("No external company id specified");

    const company = await this.externalCompanyRepository.findOne({
      _id: externalCompanyId,
      companyId: companyId,
    });

    if (!company)
      throw new NotFoundError(
        `External company with id ${externalCompanyId} not found`
      );

    // Check for uniqueness only if updating
    if (updates.email && updates.email !== company.email) {
      const existingEmail = await this.externalCompanyRepository.findOne({
        email: updates.email,
        companyId,
        _id: { $ne: externalCompanyId }, // exclude current document
      });
      if (existingEmail) throw new BadRequestError("Email already in use");
    }

    if (updates.phone && updates.phone !== company.phone) {
      const existingPhone = await this.externalCompanyRepository.findOne({
        phone: updates.phone,
        companyId,
        _id: { $ne: externalCompanyId },
      });
      if (existingPhone)
        throw new BadRequestError("Phone number already in use");
    }

    if (updates.address && updates.address !== company.address) {
      const existingAddress = await this.externalCompanyRepository.findOne({
        address: updates.address,
        companyId,
        _id: { $ne: externalCompanyId },
      });
      if (existingAddress) throw new BadRequestError("Address already in use");
    }

    return this.externalCompanyRepository.update(externalCompanyId, updates);
  }

  /**
   * Toggles the `isActive` status of an external company belonging to a given company.
   *
   * Flips the current active state (`true` ⇄ `false`) of the external company.
   * Ensures that the external company belongs to the specified company.
   *
   * @param externalCompanyId - The ObjectId of the external company to toggle.
   * @param companyId - The ObjectId of the Revalyze company that owns the external company.
   *
   * @returns Promise resolving to the updated external company document.
   *
   * @throws BadRequestError if:
   * - `companyId` is not provided
   * - `externalCompanyId` is not provided
   *
   * @throws NotFoundError if:
   * - the external company does not exist or does not belong to the specified company
   */
  async toggleIsActive(
    externalCompanyId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId
  ): Promise<IExternalCompanyDocument | null> {
    if (!companyId) throw new BadRequestError("No company id specified");
    if (!externalCompanyId)
      throw new BadRequestError("No external company id specified");

    const company = await this.externalCompanyRepository.findOne({
      _id: externalCompanyId,
      companyId: companyId,
    });

    if (!company)
      throw new NotFoundError(
        `External company with id ${externalCompanyId} not found`
      );

    company.isActive = !company.isActive;
    return company.save();
  }

  /**
   * Permanently deletes an external company by its ID if it belongs to the specified company.
   *
   * This method performs a **hard delete**, removing the document from the database.
   * ⚠️ Consider implementing a soft delete (e.g., setting `isActive` to false) if historical tracking is important.
   *
   * @param externalCompanyId - The ObjectId of the external company to delete.
   * @param companyId - The ObjectId of the Revalyze company that owns the external company.
   *
   * @returns Promise resolving to the deleted external company document, or `null` if not found.
   *
   * @throws BadRequestError if:
   * - `companyId` is not provided
   * - `externalCompanyId` is not provided
   *
   * @throws NotFoundError if:
   * - the external company does not exist or does not belong to the specified company
   */
  async deleteExternalCompany(
    externalCompanyId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId
  ): Promise<IExternalCompanyDocument | null> {
    if (!companyId) throw new BadRequestError("No company id specified");
    if (!externalCompanyId)
      throw new BadRequestError("No external company id specified");

    const company = await this.externalCompanyRepository.findOne({
      _id: externalCompanyId,
      companyId: companyId,
    });

    if (!company)
      throw new NotFoundError(
        `External company with id ${externalCompanyId} not found`
      );

    return this.externalCompanyRepository.delete(externalCompanyId);
  }
}
