import { Service } from "typedi";
import mongoose from "mongoose";
import { ReviewConfigRepository } from "../repositories/review.config.repository";
import ReviewConfig, { IReviewConfig } from "../models/review.config.model";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { CriteriaRepository } from "../repositories/criteria.repository";
import { ICriterion } from "../models/criterion.model";

interface FilterOptions {
  name?: string;
  active?: boolean;
  createdAfter?: string;
  page?: number;
  limit?: number;
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
  ): Promise<{ configs: IReviewConfig[]; total: number }> {
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
  ): Promise<IReviewConfig> {
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
    data: Partial<IReviewConfig>
  ): Promise<IReviewConfig> {
    if (!companyId) throw new BadRequestError("No company id specified");

    return this.reviewConfigRepository.create({
      ...data,
      companyId,
    });
  }

  async assignDefaultReviewConfigToCompany(
    companyId: mongoose.Types.ObjectId,
    data: Partial<IReviewConfig> = {}
  ): Promise<IReviewConfig> {
    if (!companyId) throw new BadRequestError("No company id specified");

    // Default criteria data with titles and descriptions
    const defaultCriteriaData: Partial<ICriterion>[] = [
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
      defaultCriteriaData as ICriterion[]
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
    updates: Partial<IReviewConfig>
  ): Promise<IReviewConfig> {
    if (!id) throw new BadRequestError("No review config id specified");
    if (!companyId) throw new BadRequestError("No company id specified");

    const config = await this.reviewConfigRepository.findOne({
      _id: new mongoose.Types.ObjectId(id),
      companyId,
    });

    if (!config)
      throw new NotFoundError(`Review config with id ${id} not found`);

    return this.reviewConfigRepository.update(
      id,
      updates
    ) as Promise<IReviewConfig>;
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
  ): Promise<IReviewConfig | null> {
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
