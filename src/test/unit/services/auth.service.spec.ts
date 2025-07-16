import { AuthService } from "../../../services/auth.service";
import { UserRepository } from "../../../repositories/user.repository";
import { RefreshTokenRepository } from "../../../repositories/refreshToken.repository";
import { UnauthorizedError, NotFoundError } from "../../../utils/errors";
import { generateTokens } from "../../../utils/token";
import { BadRequestError } from "../../../utils/errors";
import jwt from "jsonwebtoken";
import { CompanyRepository } from "../../../repositories/company.repository";
import { SubscriptionRepository } from "../../../repositories/subscription.repository";
import { ResetTokenRepository } from "../../../repositories/reset.token.repository";

jest.mock("jsonwebtoken");
jest.mock("../../../utils/token", () => ({
  generateTokens: jest.fn(),
}));

describe("AuthService", () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let resetTokenRepository: jest.Mocked<ResetTokenRepository>;

  const mockUser = {
    id: "user123",
    email: "test@example.com",
    password: "hashed-password",
    companyId: "company123",
    comparePassword: jest.fn(),
  };

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    } as any;

    refreshTokenRepository = {
      create: jest.fn(),
      findOldTokens: jest.fn(),
      deleteManyByIds: jest.fn(),
      findByToken: jest.fn(),
      deleteById: jest.fn(),
      deleteAllByUserId: jest.fn(),
    } as any;

    companyRepository = {
      findOne: jest.fn(),
    } as any;

    subscriptionRepository = {
      findOne: jest.fn(),
    } as any;

    resetTokenRepository = {
      findByUserId: jest.fn(),
    } as any;

    authService = new AuthService(
      userRepository,
      refreshTokenRepository,
      companyRepository,
      subscriptionRepository,
      resetTokenRepository
    );
    jest.clearAllMocks();
  });

  describe("authenticateUser", () => {
    it("should authenticate user and return tokens", async () => {
      const mockCompany = {
        id: "company123",
        name: "Test Company",
      };

      const mockSubscription = {
        id: "sub123",
        companyId: "company123",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in future
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockUser.comparePassword.mockResolvedValue(true);

      companyRepository.findOne.mockResolvedValue(mockCompany as any);
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      (generateTokens as jest.Mock).mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      refreshTokenRepository.findOldTokens.mockResolvedValue([]);

      const tokens = await authService.authenticateUser(
        "test@example.com",
        "password123"
      );

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
      expect(companyRepository.findOne).toHaveBeenCalledWith({
        _id: mockUser.companyId,
      });
      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        companyId: mockCompany.id,
      });
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user123",
          token: "refresh-token",
        })
      );
      expect(tokens).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should throw UnauthorizedError if user is not found", async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.authenticateUser("noone@example.com", "password123")
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError if password is incorrect", async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(
        authService.authenticateUser("test@example.com", "wrong-password")
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should delete old refresh tokens if found", async () => {
      const mockCompany = {
        id: "company123",
        name: "Test Company",
      };

      const mockSubscription = {
        id: "sub123",
        companyId: "company123",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60),
      };

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        password: "hashed-password",
        companyId: "company123",
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      companyRepository.findOne.mockResolvedValue(mockCompany as any);
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      (generateTokens as jest.Mock).mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const oldTokens = [{ id: 1 }, { id: 2 }];
      refreshTokenRepository.findOldTokens.mockResolvedValue(oldTokens as any);

      await authService.authenticateUser("test@example.com", "password123");

      expect(refreshTokenRepository.deleteManyByIds).toHaveBeenCalledWith([
        "1",
        "2",
      ]);
    });
  });

  describe("handleRefreshToken", () => {
    let authService: AuthService;
    let userRepository: jest.Mocked<UserRepository>;
    let companyRepository: jest.Mocked<CompanyRepository>;
    let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
    let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

    const mockUser = {
      id: "user123",
      email: "test@example.com",
      comparePassword: jest.fn(),
    };

    beforeEach(() => {
      userRepository = {
        findById: jest.fn(),
      } as any;

      refreshTokenRepository = {
        findByToken: jest.fn(),
        deleteById: jest.fn(),
        create: jest.fn(),
      } as any;

      companyRepository = {
        findOne: jest.fn(),
      } as any;

      subscriptionRepository = {
        findOne: jest.fn(),
      } as any;

      resetTokenRepository = {
        findByUserId: jest.fn(),
      } as any;

      authService = new AuthService(
        userRepository,
        refreshTokenRepository,
        companyRepository,
        subscriptionRepository,
        resetTokenRepository
      );
      jest.clearAllMocks();
    });

    it("should return new tokens when refresh token is valid", async () => {
      const mockToken = "valid-token";
      process.env.JWT_REFRESH_SECRET = "secret";

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        companyId: "company123",
        comparePassword: jest.fn(),
      };

      const mockCompany = {
        id: "company123",
        name: "Test Company",
      };

      const mockSubscription = {
        id: "sub123",
        companyId: "company123",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 60 * 60 * 1000),
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user123" });
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: "stored-token-id",
        token: mockToken,
      } as any);

      userRepository.findById.mockResolvedValue(mockUser as any);
      companyRepository.findOne.mockResolvedValue(mockCompany as any);
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      (generateTokens as jest.Mock).mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const tokens = await authService.handleRefreshToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, "secret");
      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(
        mockToken
      );
      expect(userRepository.findById).toHaveBeenCalledWith("user123");
      expect(companyRepository.findOne).toHaveBeenCalledWith({
        _id: "company123",
      });
      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        companyId: "company123",
      });
      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith(
        "stored-token-id"
      );
      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user123",
          token: "new-refresh-token",
        })
      );
      expect(tokens).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });
    });

    it("should throw UnauthorizedError if JWT is invalid", async () => {
      const mockToken = "invalid-token";
      process.env.JWT_REFRESH_SECRET = "secret";

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("JWT error");
      });

      await expect(authService.handleRefreshToken(mockToken)).rejects.toThrow(
        UnauthorizedError
      );
      expect(refreshTokenRepository.findByToken).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedError if refresh token is not found", async () => {
      const mockToken = "valid-token";
      process.env.JWT_REFRESH_SECRET = "secret";

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user123" });
      refreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(authService.handleRefreshToken(mockToken)).rejects.toThrow(
        UnauthorizedError
      );
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError if user is not found", async () => {
      const mockToken = "valid-token";
      process.env.JWT_REFRESH_SECRET = "secret";

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user123" });
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: "stored-token-id",
        token: mockToken,
      } as any);
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.handleRefreshToken(mockToken)).rejects.toThrow(
        NotFoundError
      );
      expect(refreshTokenRepository.deleteById).not.toHaveBeenCalled();
    });

    it("should delete old refresh token after use", async () => {
      const mockToken = "valid-token";
      process.env.JWT_REFRESH_SECRET = "secret";

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        companyId: "company123",
      };

      const mockCompany = {
        id: "company123",
        name: "Test Company",
      };

      const mockSubscription = {
        id: "sub123",
        companyId: "company123",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in future
      };

      // Mock token decode
      (jwt.verify as jest.Mock).mockReturnValue({ id: "user123" });

      // Mock repository methods
      refreshTokenRepository.findByToken.mockResolvedValue({
        id: "delete-id",
        token: mockToken,
      } as any);

      userRepository.findById.mockResolvedValue(mockUser as any);
      companyRepository.findOne.mockResolvedValue(mockCompany as any);
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      (generateTokens as jest.Mock).mockResolvedValue({
        accessToken: "access",
        refreshToken: "refresh",
      });

      await authService.handleRefreshToken(mockToken);

      expect(refreshTokenRepository.deleteById).toHaveBeenCalledWith(
        "delete-id"
      );
    });

    it("should create new refresh token in DB", async () => {
      const mockToken = "valid-token";
      process.env.JWT_REFRESH_SECRET = "secret";

      const mockUser = {
        id: "user123",
        email: "test@example.com",
        companyId: "company123",
      };

      const mockCompany = {
        id: "company123",
        name: "Test Company",
      };

      const mockSubscription = {
        id: "sub123",
        companyId: "company123",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 3600000), // 1 hour ahead
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: "user123" });

      refreshTokenRepository.findByToken.mockResolvedValue({
        id: "stored-id",
        token: mockToken,
      } as any);

      userRepository.findById.mockResolvedValue(mockUser as any);
      companyRepository.findOne.mockResolvedValue(mockCompany as any);
      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      (generateTokens as jest.Mock).mockResolvedValue({
        accessToken: "access",
        refreshToken: "refresh",
      });

      await authService.handleRefreshToken(mockToken);

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user123",
          token: "refresh",
        })
      );
    });
  });

  describe("logoutAllDevices", () => {
    it("should delete all refresh tokens for the user", async () => {
      await authService.logoutAllDevices("user123");
      expect(refreshTokenRepository.deleteAllByUserId).toHaveBeenCalledWith(
        "user123"
      );
    });

    it("should throw BadRequestError if userId is empty", async () => {
      await expect(authService.logoutAllDevices("")).rejects.toThrow(
        BadRequestError
      );
      expect(refreshTokenRepository.deleteAllByUserId).not.toHaveBeenCalled();
    });

    it("should throw BadRequestError if userId is undefined", async () => {
      await expect(
        authService.logoutAllDevices(undefined as any)
      ).rejects.toThrow(BadRequestError);
      expect(refreshTokenRepository.deleteAllByUserId).not.toHaveBeenCalled();
    });
  });
});
