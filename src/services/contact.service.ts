import { Service } from "typedi";
import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { ContactRepository } from "../repositories/contact.repository";
import {
  ContactModel,
  IContactDocument,
} from "../models/entities/contact.entity";
import { CreateContactDto } from "../dto/contact/contact.create.dto";
import { ExternalCompanyRepository } from "../repositories/external.company.repository";

@Service()
export class ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly externalCompanyRepository: ExternalCompanyRepository
  ) {}

  /**
   * Creates a new contact associated with both a company and external company.
   *
   * @param companyId - The ObjectId of the authenticated company.
   * @param dto - The data transfer object containing contact details.
   *
   * @returns Promise resolving to the created contact document.
   *
   * @throws BadRequestError if companyId or externalCompanyId is missing.
   * @throws BadRequestError if email is already in use.
   * @throws NotFoundError if Associated company not found.
   */
  async createContact(
    companyId: mongoose.Types.ObjectId,
    dto: CreateContactDto
  ): Promise<IContactDocument> {
    if (!companyId) throw new BadRequestError("No company id specified");
    if (!dto.externalCompanyId)
      throw new BadRequestError("No external company id specified");

    const existing = await this.contactRepository.findOne({ email: dto.email });
    if (existing) throw new BadRequestError("Email already in use");

    const externalCompany = await this.externalCompanyRepository.findById(
      dto.externalCompanyId
    );

    if (!externalCompany)
      throw new NotFoundError("Associated company not found");

    const contact = new ContactModel({
      ...dto,
      companyId,
    });

    return this.contactRepository.create(contact);
  }

  /**
   * Updates a contact owned by the specified company and external company.
   *
   * @param companyId - The ObjectId of the parent company.
   * @param contactId - The ObjectId of the contact to update.
   * @param updates - The fields to update.
   *
   * @returns Promise resolving to the updated contact document.
   *
   * @throws BadRequestError if any ID is missing.
   * @throws NotFoundError if the contact does not exist under this company.
   */
  async updateContact(
    companyId: mongoose.Types.ObjectId,
    contactId: mongoose.Types.ObjectId,
    updates: Partial<IContactDocument>
  ): Promise<IContactDocument | null> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    if (!contactId) throw new BadRequestError("Contact ID is missing");

    const contact = await this.contactRepository.findOne({
      _id: contactId,
      companyId,
    });

    if (!contact)
      throw new NotFoundError(`Contact with id ${contactId} not found`);

    return this.contactRepository.update(contactId, updates);
  }

  /**
   * Retrieves a single contact owned by the specified company and external company.
   *
   * @param contactId - The ObjectId of the contact.
   * @param companyId - The ObjectId of the parent company.
   *
   * @returns Promise resolving to the contact document.
   *
   * @throws BadRequestError if any ID is missing.
   * @throws NotFoundError if contact is not found.
   */
  async getById(
    contactId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId
  ): Promise<IContactDocument> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    if (!contactId) throw new BadRequestError("Contact ID is missing");

    const contact = await this.contactRepository.findOne({
      _id: contactId,
      companyId,
    });

    if (!contact)
      throw new NotFoundError(`Contact with id ${contactId} not found`);

    return contact;
  }

  /**
   * Retrieves paginated list of contacts belonging to a specific company and external company.
   * Supports filters: name (firstName/lastName), isActive, createdAfter.
   *
   * @param companyId - The ObjectId of the company.
   * @param externalCompanyId - The ObjectId of the external company.
   * @param name - Optional name filter.
   * @param isActive - Optional activity status filter.
   * @param createdAfter - Optional date filter.
   * @param page - Page number.
   * @param limit - Page size.
   *
   * @returns Promise resolving to `{ contacts, total }`.
   */
  async getContacts(
    companyId: mongoose.Types.ObjectId,
    externalCompanyId?: mongoose.Types.ObjectId,
    name?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20
  ): Promise<{ contacts: IContactDocument[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.contactRepository.findByFilters(
      companyId,
      externalCompanyId,
      name,
      isActive,
      createdAfter,
      page,
      limit
    );
  }

  /**
   * Toggles the `isActive` field of a contact.
   *
   * @param contactId - The ObjectId of the contact.
   * @param companyId - The ObjectId of the company.
   *
   * @returns Promise resolving to the updated contact.
   *
   * @throws BadRequestError if IDs are missing.
   * @throws NotFoundError if contact not found.
   */
  async toggleIsActive(
    contactId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId
  ): Promise<IContactDocument | null> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    if (!contactId) throw new BadRequestError("Contact ID is missing");

    const contact = await this.contactRepository.findOne({
      _id: contactId,
      companyId,
    });

    if (!contact)
      throw new NotFoundError(`Contact with id ${contactId} not found`);

    contact.isActive = !contact.isActive;
    return contact.save();
  }

  /**
   * Deletes a contact belonging to the given company and external company.
   *
   * @param contactId - The ObjectId of the contact.
   * @param companyId - The ObjectId of the company.
   *
   * @returns Promise resolving to the deleted contact or null.
   *
   * @throws BadRequestError if IDs are missing.
   * @throws NotFoundError if contact is not found.
   */
  async deleteContact(
    contactId: mongoose.Types.ObjectId,
    companyId: mongoose.Types.ObjectId
  ): Promise<IContactDocument | null> {
    if (!companyId) throw new BadRequestError("Company ID is missing");

    if (!contactId) throw new BadRequestError("Contact ID is missing");

    const contact = await this.contactRepository.findOne({
      _id: contactId,
      companyId,
    });

    if (!contact)
      throw new NotFoundError(`Contact with id ${contactId} not found`);

    return this.contactRepository.delete(contactId);
  }
}
