import { Service } from "typedi";
import { CreateCriterionDto } from "../dto/criterion/criterion.create.dto";
import mongoose from "mongoose";
import {
  CriterionModel,
  ICriterionDocument,
} from "../models/entities/criterion.entity";
import { CriteriaRepository } from "../repositories/criteria.repository";
import { BadRequestError, NotFoundError } from "../utils/errors";

@Service()
export class CriteriaService {
  constructor(private readonly criteriaRepository: CriteriaRepository) {}

  /**
   * Get paginated criteria list filtered by company and optional search term
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to an array of criteria documents.
   */
  async getCriteria(
    companyId: mongoose.Types.ObjectId,
    name?: string,
    description?: string,
    isActive?: boolean,
    createdAfter?: Date,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder: 1 | -1 = -1
  ): Promise<{ criteria: ICriterionDocument[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.criteriaRepository.findByFilters(
      companyId,
      name,
      description,
      isActive,
      createdAfter,
      page,
      limit,
      sortBy,
      sortOrder
    );
  }

  /**
   * Retrieves a single criterion by ID and company ID to ensure ownership.
   * @param id - The criterion document ID.
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to the criterion document or null.
   * @throws BadRequestError if ID or companyId is missing.
   */
  async getById(
    id: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<ICriterionDocument> {
    if (!id) throw new BadRequestError("No criterion id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const criterion = await this.criteriaRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!criterion)
      throw new NotFoundError(`Could not find criterion with id ${id}`);

    return criterion;
  }

  /**
   * Assigns a predefined set of default criteria to the specified company.
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to an array of created criterion documents.
   */
  async assignDefaultCriteriaToCompany(
    companyId: mongoose.Types.ObjectId
  ): Promise<ICriterionDocument[]> {
    if (!companyId) throw new BadRequestError("No company id specified");

    const defaultCriteria = [
      {
        title: "Innovation",
        description: "Measures the company's ability to innovate and adapt.",
      },
      {
        title: "Sustainability",
        description: "Assesses environmental responsibility and practices.",
      },
      {
        title: "Customer Satisfaction",
        description: "Evaluates feedback and satisfaction from customers.",
      },
      {
        title: "Operational Efficiency",
        description: "Looks at cost control and process optimization.",
      },
      {
        title: "Employee Engagement",
        description: "Gauges workforce motivation and morale.",
      },
    ];

    const documents = defaultCriteria.filter(Boolean).map(
      (item) =>
        new CriterionModel({
          companyId,
          title: item.title,
          description: item.description,
          isActive: true,
        })
    );

    return await this.criteriaRepository.insertMany(documents);
  }

  /**
   * Creates a new criterion for the specified company.
   * @param companyId - The ObjectId of the company.
   * @param dto - Data Transfer Object containing criterion details.
   * @returns Promise resolving to the newly created criterion document.
   */
  async createCriterion(
    companyId: mongoose.Types.ObjectId,
    dto: CreateCriterionDto
  ): Promise<ICriterionDocument> {
    if (!companyId) throw new BadRequestError("No company id specified");

    const criterion = new CriterionModel({
      companyId,
      title: dto.title,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });
    return this.criteriaRepository.create(criterion);
  }

  /**
   * Updates the active status of a criterion belonging to a company.
   * @param id - The criterion document ID.
   * @param companyId - The ObjectId of the company to ensure ownership.
   * @param isActive - Boolean indicating whether the criterion should be active or not.
   * @throws NotFoundError if no matching criterion is found.
   * @returns Promise resolving to the updated criterion document.
   */
  async updateStatus(
    id: string,
    companyId: mongoose.Types.ObjectId,
    isActive: boolean
  ): Promise<ICriterionDocument | null> {
    if (!id) throw new BadRequestError("No criterion id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const criterion = await this.criteriaRepository.findOne({
      _id: id,
      companyId,
    });

    if (!criterion) {
      throw new NotFoundError("NotFound");
    }

    criterion.isActive = isActive;
    return criterion.save();
  }

  async updateCriterion(
    id: string,
    companyId: mongoose.Types.ObjectId,
    updates: Partial<ICriterionDocument>
  ): Promise<ICriterionDocument> {
    if (!id) throw new BadRequestError("No criterion id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const updated = await this.criteriaRepository.update(
      id,
      companyId,
      updates
    );

    if (!updated) {
      throw new NotFoundError(`Criterion with id ${id} not found`);
    }

    return updated;
  }
}
