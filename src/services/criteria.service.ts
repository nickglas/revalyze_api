import { Service } from "typedi";
import { CreateCriterionDto } from "../dto/criterion/criterion.create.dto";
import mongoose from "mongoose";
import Criterion, { ICriterion } from "../models/criterion.model";
import { CriteriaRepository } from "../repositories/criteria.repository";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { Logger } from "winston";

@Service()
export class CriteriaService {
  constructor(private readonly criteriaRepository: CriteriaRepository) { }

  /**
   * Get paginated criteria list filtered by company and optional search term
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to an array of criteria documents.
   */
  async getCriteria(
    companyId: mongoose.Types.ObjectId,
    search?: string,
    page = 1,
    limit = 20
  ): Promise<{ criteria: ICriterion[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.criteriaRepository.findByCompanyId(
      companyId,
      search,
      page,
      limit
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
  ): Promise<ICriterion> {
    if (!id) throw new BadRequestError("No criterion id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const criterion = await this.criteriaRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!criterion) throw new NotFoundError(`Could not find criterion with id ${id}`);

    return criterion;
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
  ): Promise<ICriterion> {
    if (!companyId) throw new BadRequestError("No company id specified");

    const criterion = new Criterion({
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
  ): Promise<ICriterion | null> {
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
}
