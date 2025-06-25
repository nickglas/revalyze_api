import "reflect-metadata";
import mongoose from "mongoose";
import { CriteriaRepository } from "../../repositories/criteria.repository";
import Criterion, { ICriterion } from "../../models/criterion.model";

jest.mock("../../models/criterion.model");

describe("CriteriaRepository", () => {
  let repository: CriteriaRepository;
  let mockCriterion: jest.Mocked<typeof Criterion>;

  const companyId = new mongoose.Types.ObjectId();
  const criterionId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    mockCriterion = Criterion as jest.Mocked<typeof Criterion>;
    repository = new CriteriaRepository();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("findByCompanyId", () => {
    const mockCriteria: ICriterion[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        companyId,
        title: "Innovation",
        description: "Measures innovation capability",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ICriterion,
      {
        _id: new mongoose.Types.ObjectId(),
        companyId,
        title: "Sustainability",
        description: "Environmental responsibility",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ICriterion,
    ];

    beforeEach(() => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCriteria),
      };

      mockCriterion.find = jest.fn().mockReturnValue(mockQuery);
      mockCriterion.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
    });

    it("should return criteria and total count for company", async () => {
      const result = await repository.findByCompanyId(companyId);

      expect(mockCriterion.find).toHaveBeenCalledWith({ companyId });
      expect(result.criteria).toEqual(mockCriteria);
      expect(result.total).toBe(2);
    });

    it("should apply search filter on title and description", async () => {
      const searchTerm = "innovation";

      await repository.findByCompanyId(companyId, searchTerm);

      expect(mockCriterion.find).toHaveBeenCalledWith({
        companyId,
        $or: [
          { title: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
      });
    });

    it("should apply pagination with custom page and limit", async () => {
      const page = 2;
      const limit = 10;
      const expectedSkip = (page - 1) * limit; // 10

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCriteria),
      };

      mockCriterion.find = jest.fn().mockReturnValue(mockQuery);

      await repository.findByCompanyId(companyId, undefined, page, limit);

      expect(mockQuery.skip).toHaveBeenCalledWith(expectedSkip);
      expect(mockQuery.limit).toHaveBeenCalledWith(limit);
    });

    it("should use default pagination values", async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCriteria),
      };

      mockCriterion.find = jest.fn().mockReturnValue(mockQuery);

      await repository.findByCompanyId(companyId);

      expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1-1) * 20
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it("should handle search with pagination", async () => {
      const searchTerm = "sustainability";
      const page = 3;
      const limit = 5;
      const expectedSkip = (page - 1) * limit; // 10

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCriteria),
      };

      mockCriterion.find = jest.fn().mockReturnValue(mockQuery);

      await repository.findByCompanyId(companyId, searchTerm, page, limit);

      expect(mockCriterion.find).toHaveBeenCalledWith({
        companyId,
        $or: [
          { title: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(expectedSkip);
      expect(mockQuery.limit).toHaveBeenCalledWith(limit);
    });

    it("should return empty array when no criteria found", async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockCriterion.find = jest.fn().mockReturnValue(mockQuery);
      mockCriterion.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await repository.findByCompanyId(companyId);

      expect(result.criteria).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("create", () => {
    it("should call save method on the provided data", async () => {
      const mockSave = jest.fn().mockResolvedValue("saved_criterion");
      const mockData = {
        save: mockSave,
        _id: new mongoose.Types.ObjectId(),
        companyId,
        title: "Test Criterion",
        description: "Test description",
        isActive: true,
      } as unknown as ICriterion;

      const result = await repository.create(mockData);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toBe("saved_criterion");
    });
  });

  describe("findById", () => {
    it("should call Criterion.findById with correct id", async () => {
      const mockCriterionData = {
        _id: new mongoose.Types.ObjectId(criterionId),
        companyId,
        title: "Found Criterion",
        description: "Found description",
        isActive: true,
      };

      mockCriterion.findById = jest.fn().mockResolvedValue(mockCriterionData);

      const result = await repository.findById(criterionId);

      expect(mockCriterion.findById).toHaveBeenCalledWith(criterionId);
      expect(result).toEqual(mockCriterionData);
    });

    it("should return null when criterion not found", async () => {
      mockCriterion.findById = jest.fn().mockResolvedValue(null);

      const result = await repository.findById(criterionId);

      expect(mockCriterion.findById).toHaveBeenCalledWith(criterionId);
      expect(result).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should call Criterion.findOne with correct filter", async () => {
      const filter = { companyId, isActive: true };
      const mockCriterionData = {
        _id: new mongoose.Types.ObjectId(),
        companyId,
        title: "Active Criterion",
        description: "Active description",
        isActive: true,
      };

      mockCriterion.findOne = jest.fn().mockResolvedValue(mockCriterionData);

      const result = await repository.findOne(filter);

      expect(mockCriterion.findOne).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockCriterionData);
    });

    it("should return null when no document matches filter", async () => {
      const filter = { companyId, title: "Non-existent" };
      mockCriterion.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.findOne(filter);

      expect(mockCriterion.findOne).toHaveBeenCalledWith(filter);
      expect(result).toBeNull();
    });

    it("should work with complex filters", async () => {
      const filter = {
        companyId,
        $or: [
          { title: { $regex: "test", $options: "i" } },
          { description: { $regex: "test", $options: "i" } },
        ],
      };

      mockCriterion.findOne = jest.fn().mockResolvedValue(null);

      await repository.findOne(filter);

      expect(mockCriterion.findOne).toHaveBeenCalledWith(filter);
    });
  });

  describe("insertMany", () => {
    it("should call Criterion.insertMany with correct documents", async () => {
      const documents: ICriterion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          companyId,
          title: "Criterion 1",
          description: "Description 1",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ICriterion,
        {
          _id: new mongoose.Types.ObjectId(),
          companyId,
          title: "Criterion 2",
          description: "Description 2",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ICriterion,
      ];

      const mockInsertedDocs = [
        { ...documents[0], _id: new mongoose.Types.ObjectId() },
        { ...documents[1], _id: new mongoose.Types.ObjectId() },
      ];

      mockCriterion.insertMany = jest.fn().mockResolvedValue(mockInsertedDocs);

      const result = await repository.insertMany(documents);

      expect(mockCriterion.insertMany).toHaveBeenCalledWith(documents);
      expect(result).toEqual(mockInsertedDocs);
    });

    it("should handle empty array", async () => {
      const documents: ICriterion[] = [];
      mockCriterion.insertMany = jest.fn().mockResolvedValue([]);

      const result = await repository.insertMany(documents);

      expect(mockCriterion.insertMany).toHaveBeenCalledWith(documents);
      expect(result).toEqual([]);
    });

    it("should handle single document in array", async () => {
      const documents: ICriterion[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          companyId,
          title: "Single Criterion",
          description: "Single description",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ICriterion,
      ];

      const mockInsertedDoc = [
        { ...documents[0], _id: new mongoose.Types.ObjectId() },
      ];
      mockCriterion.insertMany = jest.fn().mockResolvedValue(mockInsertedDoc);

      const result = await repository.insertMany(documents);

      expect(mockCriterion.insertMany).toHaveBeenCalledWith(documents);
      expect(result).toEqual(mockInsertedDoc);
    });
  });
});
