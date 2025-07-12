// src/test/stripe-sync.service.test.ts
import "reflect-metadata";
import { StripeSyncService } from "../../services/stripe.sync.service";
import { StripeService } from "../..//services/stripe.service";
import { PlanRepository } from "../../repositories/plan.repository";
import Stripe from "stripe";
import { PlanInput } from "../../dto/plans/plan.input.dto";
import { logger } from "../../utils/logger";

jest.mock("../../utils/logger");

describe("StripeSyncService", () => {
  let stripeSyncService: StripeSyncService;
  let mockStripeService: jest.Mocked<StripeService>;
  let mockPlanRepo: jest.Mocked<PlanRepository>;

  beforeEach(() => {
    mockStripeService = {
      getProducts: jest.fn(),
      getPricesForProduct: jest.fn(),
    } as unknown as jest.Mocked<StripeService>;

    mockPlanRepo = {
      upsert: jest.fn(),
    } as unknown as jest.Mocked<PlanRepository>;

    stripeSyncService = new StripeSyncService(mockStripeService, mockPlanRepo);
  });

  it("should fetch products and upsert plans", async () => {
    // Mock products
    const fakeProducts: Stripe.Product[] = [
      {
        id: "prod_123",
        name: "Test Product",
        active: true,
        object: "product",
        livemode: false,
        description: null,
        images: [],
        statement_descriptor: null,
        unit_label: null,
        updated: 0,
        url: null,
        attributes: [],
        created: 0,
        shippable: null,
        type: "service",
        package_dimensions: null,
        metadata: {
          allowedUsers: "7",
          allowedTranscripts: "42",
        },
      } as unknown as Stripe.Product,
    ];

    // Mock prices for product
    const fakePrices: Stripe.Price[] = [
      {
        id: "price_abc",
        currency: "eur",
        unit_amount: 1500,
        recurring: {
          interval: "month",
          interval_count: 1,
          usage_type: "licensed",
          trial_period_days: null,
          meter: null,
        } as Stripe.Price.Recurring,
        object: "price",
        active: true,
        billing_scheme: "per_unit",
        created: 0,
        livemode: false,
        lookup_key: null,
        metadata: {},
        nickname: null,
        product: "prod_123",
        tax_behavior: "unspecified",
        tiers_mode: null,
        transform_quantity: null,
        type: "recurring",
        unit_amount_decimal: "1500",
      } as unknown as Stripe.Price,
    ];

    mockStripeService.getProducts.mockResolvedValue(fakeProducts);
    mockStripeService.getPricesForProduct.mockResolvedValue(fakePrices);

    // Run the method
    await stripeSyncService.syncProducts();

    // Assert calls
    expect(mockStripeService.getProducts).toHaveBeenCalledTimes(1);
    expect(mockStripeService.getPricesForProduct).toHaveBeenCalledWith(
      "prod_123"
    );

    // Check upsert call with correct transformed PlanInput
    expect(mockPlanRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining<Partial<PlanInput>>({
        name: "Test Product",
        stripeProductId: "prod_123",
        currency: "eur",
        billingOptions: [
          {
            interval: "month",
            stripePriceId: "price_abc",
            amount: 1500,
          },
        ],
        allowedUsers: 7,
        allowedTranscripts: 42,
        isActive: true,
      })
    );

    // Optionally verify logger calls
    expect(logger.info).toHaveBeenCalledWith(
      "🔁 Fetching products from Stripe..."
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📦 Synced: Test Product (prod_123)"
    );
  });
});
