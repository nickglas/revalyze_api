// __tests__/auth.service.test.ts

import mongoose from "mongoose";
import { AuthService } from "../../services/auth.service";
import { UserRepository } from "../../repositories/user.repository";
import { RefreshTokenRepository } from "../../repositories/refreshToken.repository";
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
} from "../../utils/errors";
import { generateTokens } from "../../utils/token";
import jwt from "jsonwebtoken";

jest.mock("../../utils/token");
jest.mock("jsonwebtoken");

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockRefreshTokenRepository = {
  create: jest.fn(),
  findOldTokens: jest.fn(),
  deleteManyByIds: jest.fn(),
  findByToken: jest.fn(),
  deleteById: jest.fn(),
  deleteAllByUserId: jest.fn(),
};

const authService = new AuthService(
  mockUserRepository as unknown as UserRepository,
  mockRefreshTokenRepository as unknown as RefreshTokenRepository
);

// Geldig ObjectId voor gebruik in tests
const validObjectId = new mongoose.Types.ObjectId();

describe("AuthService", () => {
  describe("authenticateUser", () => {
    it("should authenticate user and return tokens", async () => {
      const mockUser = {
        id: validObjectId.toString(),
        email: "test@example.com",
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockTokens = { accessToken: "access", refreshToken: "refresh" };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (generateTokens as jest.Mock).mockReturnValue(mockTokens);
      mockRefreshTokenRepository.findOldTokens.mockResolvedValue([]);

      const tokens = await authService.authenticateUser(
        "test@example.com",
        "password"
      );

      expect(tokens).toEqual(mockTokens);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: validObjectId.toString(),
          token: "refresh",
        })
      );
    });

    it("should throw UnauthorizedError if user not found", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.authenticateUser("wrong@example.com", "pass")
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError if password is invalid", async () => {
      const user = { comparePassword: jest.fn().mockResolvedValue(false) };
      mockUserRepository.findByEmail.mockResolvedValue(user);

      await expect(
        authService.authenticateUser("email", "wrong")
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should delete old tokens if found", async () => {
      const mockUser = {
        id: validObjectId.toString(),
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      (generateTokens as jest.Mock).mockReturnValue({
        accessToken: "a",
        refreshToken: "r",
      });
      mockRefreshTokenRepository.findOldTokens.mockResolvedValue([
        { id: { toString: () => "t1" } },
        { id: { toString: () => "t2" } },
      ]);

      await authService.authenticateUser("test@example.com", "pass");

      expect(mockRefreshTokenRepository.deleteManyByIds).toHaveBeenCalledWith([
        "t1",
        "t2",
      ]);
    });
  });

  describe("handleRefreshToken", () => {
    it("should generate new tokens and delete old refresh token", async () => {
      const user = { id: validObjectId.toString(), email: "test@example.com" };
      const token = "valid.token";
      const newTokens = {
        accessToken: "newAccess",
        refreshToken: "newRefresh",
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        id: validObjectId.toString(),
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue({ id: "t1" });
      mockUserRepository.findById = jest.fn().mockResolvedValue(user);
      (generateTokens as jest.Mock).mockReturnValue(newTokens);

      const result = await authService.handleRefreshToken(token);

      expect(result).toEqual(newTokens);
      expect(mockRefreshTokenRepository.deleteById).toHaveBeenCalledWith("t1");
      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "newRefresh",
          userId: validObjectId.toString(),
        })
      );
    });

    it("should throw UnauthorizedError on invalid JWT", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid");
      });

      await expect(authService.handleRefreshToken("invalid")).rejects.toThrow(
        UnauthorizedError
      );
    });

    it("should throw UnauthorizedError if token not found in DB", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        id: validObjectId.toString(),
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(authService.handleRefreshToken("token")).rejects.toThrow(
        UnauthorizedError
      );
    });

    it("should throw NotFoundError if user not found", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        id: validObjectId.toString(),
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue({ _id: "t1" });
      mockUserRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(authService.handleRefreshToken("token")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("logoutAllDevices", () => {
    it("should delete all refresh tokens for user", async () => {
      await authService.logoutAllDevices(validObjectId.toString());

      expect(mockRefreshTokenRepository.deleteAllByUserId).toHaveBeenCalledWith(
        validObjectId.toString()
      );
    });

    it("should throw BadRequestError if no userId is given", async () => {
      await expect(authService.logoutAllDevices("")).rejects.toThrow(
        BadRequestError
      );
    });
  });
});
