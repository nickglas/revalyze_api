import "reflect-metadata";
import mongoose from "mongoose";
import { CriteriaService } from "../../services/criteria.service";
import { CriteriaRepository } from "../../repositories/criteria.repository";
import Criterion, { ICriterion } from "../../models/criterion.model";
import { CreateCriterionDto } from "../../dto/criterion/criterion.create.dto";
import { BadRequestError, NotFoundError } from "../../utils/errors";

jest.mock("../../models/criterion.model");

describe("CriteriaService", () => {
  let service: CriteriaService;
  let mockRepo: jest.Mocked<CriteriaRepository>;

  const companyId = new mongoose.Types.ObjectId();
  const criterionId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    mockRepo = {
      findByCompanyId: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CriteriaRepository>;

    service = new CriteriaService(mockRepo);
  });

  describe("getCriteria", () => {
    it("should throw if no companyId", async () => {
      // @ts-expect-error test missing companyId
      await expect(service.getCriteria(null)).rejects.toThrow(BadRequestError);
    });

    it("should return criteria and total", async () => {
      const mockCriteria: ICriterion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          companyId,
          title: "t",
          description: "desc",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ICriterion,
      ];
      mockRepo.findByCompanyId.mockResolvedValue({
        criteria: mockCriteria,
        total: 1,
      });

      const result = await service.getCriteria(companyId, "search", 1, 20);

      expect(mockRepo.findByCompanyId).toHaveBeenCalledWith(
        companyId,
        "search",
        1,
        20
      );
      expect(result.criteria).toEqual(mockCriteria);
      expect(result.total).toBe(1);
    });
  });

  describe("getById", () => {
    it("should throw if no id is provided", async () => {
      // @ts-expect-error intentionally invalid for test
      await expect(service.getById(null, companyId)).rejects.toThrow(BadRequestError);
    });

    it("should throw if no companyId is provided", async () => {
      // @ts-expect-error intentionally invalid for test
      await expect(service.getById(criterionId, null)).rejects.toThrow(BadRequestError);
    });

    it("should throw NotFoundError if criterion not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.getById(criterionId, companyId)).rejects.toThrow(
        new NotFoundError(`Could not find criterion with id ${criterionId}`)
      );

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        _id: new mongoose.Types.ObjectId(criterionId),
        companyId,
      });
    });

    it("should return criterion if found", async () => {
      const mockCriterion = new Criterion({
        _id: new mongoose.Types.ObjectId(criterionId),
        companyId,
        title: "Test Criterion",
        description: "Test Description",
        isActive: true,
      });
    
      mockRepo.findOne.mockResolvedValue(mockCriterion);
    
      const result = await service.getById(criterionId, companyId);
    
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        _id: new mongoose.Types.ObjectId(criterionId),
        companyId,
      });
      expect(result).toBe(mockCriterion);
    });
  });

  describe("createCriterion", () => {
    const dto: CreateCriterionDto = {
      title: "Title",
      description: "A description between 30 and 200 chars long..",
      isActive: true,
    };

    it("should throw if no companyId", async () => {
      // @ts-expect-error test missing companyId
      await expect(service.createCriterion(null, dto)).rejects.toThrow(
        BadRequestError
      );
    });

    it("should create and return criterion", async () => {
      // mock mongoose model instance and .save
      const fakeCriterion = new Criterion({
        companyId,
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive,
      }) as ICriterion;

      mockRepo.create.mockResolvedValue(fakeCriterion);

      const result = await service.createCriterion(companyId, dto);

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toBe(fakeCriterion);
    });
  });

  describe("updateStatus", () => {
    it("should throw if no id", async () => {
      await expect(
        service.updateStatus(criterionId, undefined as any, true)
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw if no companyId", async () => {
      await expect(
        service.updateStatus(criterionId, undefined as any, true)
      ).rejects.toThrow(BadRequestError);
    });

    it("should throw NotFoundError if criterion not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(criterionId, companyId, true)
      ).rejects.toThrow(NotFoundError);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        _id: criterionId,
        companyId,
      });
    });

    it("should update isActive and save", async () => {
      const saveMock = jest.fn().mockResolvedValue(true);

      const mockCriterion = new Criterion({
        _id: new mongoose.Types.ObjectId("60f5a3c3e1b1c8b5c8f6eabc"),
        companyId: new mongoose.Types.ObjectId("60f5a3c3e1b1c8b5c8f6eabd"),
        title: "Test Criterion",
        description: "A description for testing",
        isActive: false,
      });

      mockCriterion.save = saveMock;

      mockRepo.findOne.mockResolvedValue(mockCriterion);

      const result = await service.updateStatus(criterionId, companyId, true);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        _id: criterionId,
        companyId,
      });
      expect(mockCriterion.isActive).toBe(true);
      expect(saveMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
