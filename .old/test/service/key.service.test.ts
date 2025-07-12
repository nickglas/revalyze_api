// __tests__/apiKey.service.test.ts

import { ApiKeyService } from "../../services/key.service";
import { CompanyRepository } from "../../repositories/company.repository";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import bcrypt from "bcryptjs";
import crypto from "crypto";

jest.mock("bcryptjs");
jest.mock("crypto");

const mockCompanyRepository = {
  findById: jest.fn(),
  update: jest.fn(),
};

const apiKeyService = new ApiKeyService(
  mockCompanyRepository as unknown as CompanyRepository
);

describe("ApiKeyService", () => {
  const mockCompanyId = "company123";
  const fakeRawKey = "raw-api-key";
  const fakeHashedKey = "hashed-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: () => fakeRawKey,
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue(fakeHashedKey);
  });

  describe("regenerateApiKey", () => {
    it("should generate, hash, store and return raw API key", async () => {
      const mockCompany = { id: mockCompanyId };
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);

      const result = await apiKeyService.regenerateApiKey(mockCompanyId);

      expect(mockCompanyRepository.findById).toHaveBeenCalledWith(
        mockCompanyId
      );
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(bcrypt.hash).toHaveBeenCalledWith(fakeRawKey, 10);
      expect(mockCompanyRepository.update).toHaveBeenCalledWith(mockCompanyId, {
        ...mockCompany,
        hashedApiKey: fakeHashedKey,
        apiKeyCreatedAt: expect.any(Date),
      });
      expect(result).toBe(fakeRawKey);
    });

    it("should throw BadRequestError if no company ID is given", async () => {
      await expect(apiKeyService.regenerateApiKey("")).rejects.toThrow(
        BadRequestError
      );
    });

    it("should throw NotFoundError if company does not exist", async () => {
      mockCompanyRepository.findById.mockResolvedValue(null);
      await expect(
        apiKeyService.regenerateApiKey(mockCompanyId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("verifyApiKey", () => {
    it("should return true for valid API key", async () => {
      const mockCompany = { hashedApiKey: fakeHashedKey };
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await apiKeyService.verifyApiKey(
        mockCompanyId,
        fakeRawKey
      );

      expect(mockCompanyRepository.findById).toHaveBeenCalledWith(
        mockCompanyId
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(fakeRawKey, fakeHashedKey);
      expect(result).toBe(true);
    });

    it("should return false if company not found", async () => {
      mockCompanyRepository.findById.mockResolvedValue(null);
      const result = await apiKeyService.verifyApiKey(
        mockCompanyId,
        fakeRawKey
      );
      expect(result).toBe(false);
    });

    it("should return false if no hashed key exists", async () => {
      const mockCompany = { hashedApiKey: null };
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);
      const result = await apiKeyService.verifyApiKey(
        mockCompanyId,
        fakeRawKey
      );
      expect(result).toBe(false);
    });

    it("should return false if key comparison fails", async () => {
      const mockCompany = { hashedApiKey: fakeHashedKey };
      mockCompanyRepository.findById.mockResolvedValue(mockCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await apiKeyService.verifyApiKey(
        mockCompanyId,
        fakeRawKey
      );

      expect(result).toBe(false);
    });
  });
});
