import { PlanService } from "../../services/plan.service";
import { PlanRepository } from "../../repositories/plan.repository";
import { BadRequestError } from "../../utils/errors";
import { IPlan } from "../../models/plan.model";
import { BillingOption } from "../../models/plan.model";

const mockPlanRepository = {
  findByStripeProductId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  deleteByStripeProductId: jest.fn(),
};

const planService = new PlanService(
  mockPlanRepository as unknown as PlanRepository
);

interface BillingOptionInput {
  interval: "day" | "week" | "month" | "year" | "one_time";
  stripePriceId: string;
  amount: number;
}

interface PlanInput {
  name: string;
  stripeProductId: string;
  currency: string;
  allowedUsers: number;
  allowedTranscripts: number;
  features?: string[];
  metadata?: Record<string, string>;
  billingOptions: BillingOptionInput[];
}

const planInput: PlanInput = {
  name: "Basic",
  stripeProductId: "prod_123",
  currency: "usd",
  allowedUsers: 5,
  allowedTranscripts: 100,
  features: ["feature1", "feature2"],
  metadata: { region: "eu" },
  billingOptions: [
    {
      interval: "month",
      stripePriceId: "price_123",
      amount: 1999,
    },
  ],
};

describe("PlanService", () => {
  describe("upsertPlan", () => {
    it("should create a new plan if none exists", async () => {
      mockPlanRepository.findByStripeProductId.mockResolvedValue(null);
      const createdPlan = { ...planInput, id: "new-plan" };
      mockPlanRepository.create.mockResolvedValue(createdPlan);

      const result = await planService.upsertPlan(planInput);

      expect(mockPlanRepository.findByStripeProductId).toHaveBeenCalledWith(
        "prod_123"
      );
      expect(mockPlanRepository.create).toHaveBeenCalledWith(planInput);
      expect(result).toEqual(createdPlan);
    });

    it("should update existing plan if found", async () => {
      const existingPlan = {
        ...planInput,
        name: "Old",
        stripeProductId: "prod_123",
        save: jest.fn(),
      };
      mockPlanRepository.findByStripeProductId.mockResolvedValue(existingPlan);
      const updatedPlan = { ...existingPlan, name: "Basic" };
      mockPlanRepository.update.mockResolvedValue(updatedPlan);

      const result = await planService.upsertPlan(planInput);

      expect(existingPlan.name).toBe("Basic");
      expect(existingPlan.currency).toBe("usd");
      expect(mockPlanRepository.update).toHaveBeenCalledWith(existingPlan);
      expect(result).toEqual(updatedPlan);
    });
  });

  describe("getAllPlans", () => {
    it("should return all plans", async () => {
      const plans = [
        { name: "Basic", stripeProductId: "prod_123" },
        { name: "Pro", stripeProductId: "prod_456" },
      ];
      mockPlanRepository.findAll.mockResolvedValue(plans);

      const result = await planService.getAllPlans();

      expect(mockPlanRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(plans);
    });
  });

  describe("deletePlan", () => {
    it("should delete a plan by stripeProductId", async () => {
      mockPlanRepository.deleteByStripeProductId.mockResolvedValue({
        deletedCount: 1,
      });

      const result = await planService.deletePlan("prod_123");

      expect(mockPlanRepository.deleteByStripeProductId).toHaveBeenCalledWith(
        "prod_123"
      );
      expect(result).toEqual({ deletedCount: 1 });
    });

    it("should throw BadRequestError if no product id given", async () => {
      await expect(planService.deletePlan("")).rejects.toThrow(BadRequestError);
    });
  });
});
