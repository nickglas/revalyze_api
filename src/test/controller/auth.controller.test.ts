import request from "supertest";
import app from "../../app";
import User from "../../models/user.model";
import refreshTokenModel from "../../models/refreshToken.model";
import Company from "../../models/company.model";
import bcrypt from "bcryptjs";

describe("Auth Controller", () => {
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeEach(async () => {
    await User.deleteMany({});
    await refreshTokenModel.deleteMany({});

    const company = await new Company({
      name: "Revalyze",
      mainEmail: "nickglas@revalyze.io",
      subscriptionPlanId: "plan_pro",
    });

    const user = await new User({
      email: "test@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "employee",
      name: "Test User",
      companyId: company.id,
      isActive: true,
    }).save();

    userId = user.id.toString();

    // Login once to get tokens for protected route tests
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  describe("GET /api/v1/auth/", () => {
    it("should return user profile when authenticated", async () => {
      const res = await request(app)
        .get("/api/v1/auth/")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("email", "test@example.com");
      expect(res.body).toHaveProperty("name", "Test User");
    });

    it("should reject without auth token", async () => {
      const res = await request(app).get("/api/v1/auth/");

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully without logoutAllDevices", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ logoutAllDevices: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Logged out successfully");
    });

    it("should logout from all devices when logoutAllDevices true", async () => {
      // Add some refresh tokens to simulate multiple devices if needed here

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ logoutAllDevices: true });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Logged out from all devices");
      // Optionally, check DB that tokens were removed
    });

    it("should reject unauthorized logout", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .send({ logoutAllDevices: true });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should issue new tokens given a valid refresh token", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "test@example.com", password: "password123" });

      const freshRefreshToken = loginRes.body.refreshToken;

      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: freshRefreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      // expect(res.body.refreshToken).not.toBe(freshRefreshToken);
    });

    it("should reject missing refresh token", async () => {
      const res = await request(app).post("/api/v1/auth/refresh").send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Refresh token required");
    });

    it("should reject invalid or expired refresh token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: "invalidtoken" });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid or expired refresh token");
    });
  });
});
