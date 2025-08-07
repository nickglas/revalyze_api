import { Service } from "typedi";
import mongoose from "mongoose";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import {
  IReviewConfigDocument,
  ReviewConfigModel,
} from "../models/entities/review.config.entity";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { CriteriaRepository } from "../repositories/criteria.repository";
import {
  CriterionModel,
  ICriterionDocument,
} from "../models/entities/criterion.entity";
import { UpdateReviewConfigDto } from "../dto/review.config/review.config.update.dto";
import { CreateReviewConfigDto } from "../dto/review.config/review.config.create.dto";

export interface FilterOptions {
  name?: string;
  isActive?: boolean;
  createdAfter?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 1 | -1;
}

@Service()
export class ReviewConfigService {
  constructor(
    private readonly reviewConfigRepository: ReviewConfigRepository,
    private readonly criteriaRepository: CriteriaRepository
  ) {}

  /**
   * Retrieves a paginated list of review configurations for a given company,
   * optionally filtered by name, active status, and creation date.
   *
   * @param companyId - The ObjectId of the company.
   * @param filters - Optional filters: name, active status, creation date, pagination.
   * @returns Promise resolving to a paginated list of review configs and total count.
   * @throws BadRequestError if companyId is not provided.
   */
  async getReviewConfigs(
    companyId: mongoose.Types.ObjectId,
    filters: FilterOptions = {}
  ): Promise<{ configs: IReviewConfigDocument[]; total: number }> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.reviewConfigRepository.findByCompanyIdWithFilters(
      companyId,
      filters
    );
  }

  /**
   * Retrieves a single review configuration by ID and company ID to ensure ownership.
   *
   * @param id - The review configuration document ID.
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to the review configuration document.
   * @throws BadRequestError if ID or companyId is missing.
   * @throws NotFoundError if the configuration is not found.
   */
  async getById(
    id: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IReviewConfigDocument> {
    if (!id) throw new BadRequestError("No review config id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const config = await this.reviewConfigRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!config)
      throw new NotFoundError(`Review config with id ${id} not found`);

    return config;
  }

  /**
   * Creates a new review configuration for the specified company.
   *
   * @param companyId - The ObjectId of the company.
   * @param data - Partial review config data including name, criteria, and model settings.
   * @returns Promise resolving to the created review configuration document.
   * @throws BadRequestError if companyId is not provided.
   */
  async createReviewConfig(
    companyId: mongoose.Types.ObjectId,
    data: CreateReviewConfigDto
  ): Promise<IReviewConfigDocument> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.reviewConfigRepository.create({
      ...data,
      companyId,
    });
  }

  async assignDefaultReviewConfigToCompany(
    companyId: mongoose.Types.ObjectId,
    data: Partial<IReviewConfigDocument> = {}
  ): Promise<IReviewConfigDocument> {
    if (!companyId) throw new BadRequestError("No company id specified");

    // Default criteria data with titles and descriptions
    const defaultCriteriaData: Partial<ICriterionDocument>[] = [
      {
        title: "Empathie",
        description:
          "Evalueer of de medewerker blijk gaf van empathie tijdens het gesprek. Let op of de medewerker begrip toont voor de situatie, emotioneel aansluit bij de klant, en oprechte betrokkenheid uitstraalt.",
        isActive: true,
        companyId,
      },
      {
        title: "Oplossingsgerichtheid",
        description:
          "Kijk of de medewerker actief werkte aan het oplossen van het probleem van de klant. Was de geboden oplossing passend? Werd er snel en duidelijk richting een uitkomst gestuurd?",
        isActive: true,
        companyId,
      },
      {
        title: "Professionaliteit",
        description:
          "Beoordeel of de medewerker professioneel overkwam. Let op taalgebruik, toon, houding en consistentie. Was het gesprek beleefd, respectvol en zakelijk waar nodig?",
        isActive: true,
        companyId,
      },
      {
        title: "Klanttevredenheid",
        description:
          "Analyseer hoe tevreden de klant waarschijnlijk was aan het einde van de interactie. Gebruik signalen in de tekst zoals woordkeuze, afsluitende zinnen en toon om een inschatting te maken van de tevredenheid.",
        isActive: true,
        companyId,
      },
      {
        title: "Sentiment klant",
        description:
          "Analyseer het algemene sentiment van de klant tijdens het gesprek. Was de toon positief, neutraal of negatief? En hoe ontwikkelde dit sentiment zich tijdens het gesprek?",
        isActive: true,
        companyId,
      },
      {
        title: "Helderheid en begrijpelijkheid",
        description:
          "Evalueer of de medewerker duidelijke en begrijpelijke taal gebruikte. Werden instructies of informatie op een toegankelijke manier uitgelegd?",
        isActive: true,
        companyId,
      },
      {
        title: "Responsiviteit/luistervaardigheid",
        description:
          "Beoordeel of de medewerker actief luisterde en passend reageerde op de input van de klant. Werden vragen goed beantwoord? Was er sprake van herhaling, bevestiging of doorvragen?",
        isActive: true,
        companyId,
      },
      {
        title: "Tijdsefficiëntie/doelgerichtheid",
        description:
          "Beoordeel of het gesprek doelgericht verliep. Werden irrelevante uitweidingen vermeden? Was het gesprek effectief in het bereiken van een oplossing zonder onnodige vertraging?",
        isActive: true,
        companyId,
      },
    ];

    // Insert many criteria
    const savedCriteria = await this.criteriaRepository.insertMany(
      defaultCriteriaData as ICriterionDocument[]
    );

    // Extract criteria ids
    const criteriaIds = savedCriteria.map((c) => c._id);

    // Create ReviewConfig with linked criteriaIds
    const reviewConfig = await this.reviewConfigRepository.create({
      name: "Default Review Configuration",
      criteriaIds,
      modelSettings: { temperature: 0.7, maxTokens: 1000 },
      companyId,
      ...data,
    });

    return reviewConfig;
  }

  /**
   * Updates an existing review configuration by ID, scoped to the company for validation.
   *
   * @param id - The review config document ID to update.
   * @param companyId - The ObjectId of the company.
   * @param updates - Partial fields to update, such as name or model settings.
   * @returns Promise resolving to the updated review config document.
   * @throws BadRequestError if ID or companyId is not provided.
   * @throws NotFoundError if the config is not found or doesn't belong to the company.
   */
  async updateReviewConfig(
    id: string,
    companyId: mongoose.Types.ObjectId,
    updates: UpdateReviewConfigDto
  ): Promise<IReviewConfigDocument> {
    if (!id) throw new BadRequestError("No review config id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    // Find existing config
    const config = await this.reviewConfigRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!config)
      throw new NotFoundError(`Review config with id ${id} not found`);

    // Convert criteriaIds strings to ObjectId[]
    if (updates.criteriaIds) {
      const criteriaObjectIds = updates.criteriaIds.map(
        (cid) => new mongoose.Types.ObjectId(cid)
      );

      // Check if criteriaIds exist in DB
      const existingCriteria = await this.criteriaRepository.findManyByIds(
        criteriaObjectIds
      );
      if (existingCriteria.length !== criteriaObjectIds.length) {
        throw new BadRequestError("One or more criteriaIds are invalid");
      }

      config.criteriaIds = criteriaObjectIds;
    }

    // Update other fields safely
    if (updates.name !== undefined) config.name = updates.name;

    if (updates.modelSettings !== undefined) {
      config.modelSettings = {
        ...config.modelSettings, // keep existing keys
        ...updates.modelSettings, // overwrite with updates
      };
    }

    if (updates.isActive !== undefined) config.isActive = updates.isActive;

    // Save updated document
    const updatedConfig = await this.reviewConfigRepository.update(
      config._id,
      config
    );

    if (!updatedConfig) {
      throw new NotFoundError(`Failed to update review config with id ${id}`);
    }

    return updatedConfig;
  }

  /**
   * Toggles the activation status (isActive) of a review configuration,
   * ensuring it belongs to the given company.
   *
   * @param companyId - The ObjectId of the company that owns the configuration.
   * @param configId - The ObjectId of the review configuration to toggle.
   * @returns Promise resolving to the updated review configuration document.
   * @throws NotFoundError if the configuration is not found or doesn't belong to the company.
   */
  async toggleActivationStatus(
    companyId: mongoose.Types.ObjectId,
    configId: mongoose.Types.ObjectId
  ) {
    const config = await this.reviewConfigRepository.findOne({
      _id: configId,
      companyId,
    });

    if (!config) {
      throw new NotFoundError(`Could not find config with id ${configId}`);
    }

    config.isActive = !config.isActive;

    return await this.reviewConfigRepository.update(config._id, config);
  }

  /**
   * Deletes a review configuration by ID, validating it belongs to the given company.
   *
   * @param id - The review config document ID to delete.
   * @param companyId - The ObjectId of the company.
   * @returns Promise resolving to the deleted review config document, or null.
   * @throws BadRequestError if ID or companyId is not provided.
   * @throws NotFoundError if the config is not found or doesn't belong to the company.
   */
  async deleteReviewConfig(
    id: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IReviewConfigDocument | null> {
    if (!id) throw new BadRequestError("No review config id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const config = await this.reviewConfigRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!config)
      throw new NotFoundError(`Review config with id ${id} not found`);

    return this.reviewConfigRepository.delete(id);
  }
}
