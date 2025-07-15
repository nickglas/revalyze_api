// __mocks__/stripe.service.ts
export class StripeService {
  createCustomer = jest.fn().mockResolvedValue({
    id: "cus_mocked123",
    email: "test@example.com",
  });

  createCheckoutSession = jest.fn().mockResolvedValue({
    id: "cs_mocked123",
    url: "https://mocked-checkout-url.com",
  });

  // Optional: if other parts of your app use these
  getSubscription = jest.fn();
  updateSubscription = jest.fn();
  createSubscriptionPlan = jest.fn();
  getAvailableSubscriptions = jest.fn();
}
