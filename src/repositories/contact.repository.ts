import { Service } from "typedi";
import mongoose, { FilterQuery } from "mongoose";
import {
  ContactModel,
  IContactDocument,
} from "../models/entities/contact.entity";

@Service()
export class ContactRepository {
  /**
   * Retrieves a paginated list of contacts belonging to a given external company and parent company.
   *
   * Supports filtering by name (firstName or lastName), activity status, and creation date.
   *
   * @param companyId - The ObjectId of the Revalyze parent company.
   * @param externalCompanyId - The ObjectId of the external company to which the contacts belong.
   * @param name - Optional name filter (matches partial firstName or lastName, case-insensitive).
   * @param isActive - Optional boolean to filter by active/inactive contacts.
   * @param createdAfter - Optional filter for contacts created after this date.
   * @param page - Page number for pagination (default: 1).
   * @param limit - Maximum number of results per page (default: 20).
   *
   * @returns Promise resolving to an object with paginated `contacts` array and `total` count.
   */
  async findByFilters(
    companyId: mongoose.Types.ObjectId,
    externalCompanyId?: mongoose.Types.ObjectId,
    name?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20
  ): Promise<{ contacts: IContactDocument[]; total: number }> {
    const filter: FilterQuery<IContactDocument> = {
      companyId,
    };

    if (externalCompanyId) {
      filter.externalCompanyId = externalCompanyId;
    }

    if (name) {
      filter.$or = [
        { firstName: { $regex: name, $options: "i" } },
        { lastName: { $regex: name, $options: "i" } },
      ];
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (createdAfter) {
      filter.createdAt = { $gte: createdAfter };
    }

    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      ContactModel.find(filter)
        .populate("externalCompany")
        .skip(skip)
        .limit(limit)
        .exec(),
      ContactModel.countDocuments(filter).exec(),
    ]);

    return { contacts, total };
  }

  /**
   * Persists a new contact document to the database.
   *
   * @param data - The contact document instance to save.
   * @returns Promise resolving to the saved contact.
   */
  async create(data: IContactDocument) {
    return await data.save();
  }

  /**
   * Retrieves a contact document by its unique MongoDB `_id`.
   *
   * @param id - The ObjectId or string ID of the contact to retrieve.
   * @returns Promise resolving to the found contact, or `null` if not found.
   */
  async findById(id: mongoose.Types.ObjectId | string) {
    return ContactModel.findById(id).populate("externalCompany").exec();
  }

  /**
   * Retrieves a single contact matching the specified filter query.
   *
   * @param filter - A MongoDB filter object to find a contact.
   * @returns Promise resolving to the first matching contact, or `null` if none found.
   */
  async findOne(filter: FilterQuery<IContactDocument>) {
    return ContactModel.findOne(filter).populate("externalCompany").exec();
  }

  /**
   * Updates an existing contact document by ID with the provided fields.
   *
   * @param id - The ObjectId or string ID of the contact to update.
   * @param updates - Partial contact fields to update.
   *
   * @returns Promise resolving to the updated contact document, or `null` if not found.
   */
  async update(
    id: mongoose.Types.ObjectId | string,
    updates: Partial<IContactDocument>
  ) {
    return ContactModel.findByIdAndUpdate(id, updates, {
      new: true,
    })
      .populate("externalCompany")
      .exec();
  }

  /**
   * Permanently deletes a contact document from the database by its ID.
   *
   * ⚠️ This is a hard delete. Consider implementing a soft delete (`isActive = false`) if historical data is important.
   *
   * @param id - The ObjectId or string ID of the contact to delete.
   * @returns Promise resolving to the deleted contact document, or `null` if not found.
   */
  async delete(id: mongoose.Types.ObjectId | string) {
    return ContactModel.findByIdAndDelete(id).exec();
  }
}
