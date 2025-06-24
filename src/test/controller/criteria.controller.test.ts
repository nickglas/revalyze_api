import "reflect-metadata";

import {
  getCriteria,
  createCriterion,
  updateStatus,
} from "../../controllers/criteria.controller";
import { CriteriaService } from "../../services/criteria.service";
import mongoose from "mongoose";

jest.mock("typedi", () => ({
  Container: {
    get: jest.fn(),
  },
}));

// We'll mock the service instance and override Container.get to return it
const mockCriteriaService = {
  getCriteria: jest.fn(),
  createCriterion: jest.fn(),
  updateStatus: jest.fn(),
};

import { Container } from "typedi";
(Container.get as jest.Mock).mockReturnValue(mockCriteriaService);

describe("CriteriaController", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      user: { companyId: new mongoose.Types.ObjectId().toHexString() },
      query: {},
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe("getCriteria", () => {
    it("should call getCriteria service and return data", async () => {
      const fakeData = {
        criteria: [{ title: "Test Criterion" }],
        total: 1,
      };
      mockCriteriaService.getCriteria.mockResolvedValue(fakeData);

      req.query = { search: "test", page: "2", limit: "5" };

      await getCriteria(req, res, next);

      expect(mockCriteriaService.getCriteria).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId(req.user.companyId),
        "test",
        2,
        5
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: fakeData.criteria,
        meta: {
          total: 1,
          page: 2,
          limit: 5,
          pages: 1,
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("Service failure");
      mockCriteriaService.getCriteria.mockRejectedValue(error);

      await getCriteria(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("createCriterion", () => {
    it("should call createCriterion service and return new criterion", async () => {
      const newCriterion = { _id: "123", title: "New Criterion" };
      mockCriteriaService.createCriterion.mockResolvedValue(newCriterion);

      req.body = {
        title: "New Criterion",
        description: "Valid description with enough length",
        isActive: true,
      };

      await createCriterion(req, res, next);

      expect(mockCriteriaService.createCriterion).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId(req.user.companyId),
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newCriterion);
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("Create failure");
      mockCriteriaService.createCriterion.mockRejectedValue(error);

      await createCriterion(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateStatus", () => {
    it("should update isActive status and return updated criterion", async () => {
      const updatedCriterion = { _id: "123", isActive: true };
      mockCriteriaService.updateStatus.mockResolvedValue(updatedCriterion);

      req.params.id = "123";
      req.body.isActive = true;

      await updateStatus(req, res, next);

      expect(mockCriteriaService.updateStatus).toHaveBeenCalledWith(
        "123",
        new mongoose.Types.ObjectId(req.user.companyId),
        true
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedCriterion);
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 if isActive is not boolean", async () => {
      req.params.id = "123";
      req.body.isActive = "true"; // invalid, string instead of boolean

      await updateStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "isActive must be boolean",
      });
      expect(mockCriteriaService.updateStatus).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next with error if service throws", async () => {
      const error = new Error("Update failure");
      mockCriteriaService.updateStatus.mockRejectedValue(error);

      req.params.id = "123";
      req.body.isActive = true;

      await updateStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
