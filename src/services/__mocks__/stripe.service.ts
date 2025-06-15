// __mocks__/stripe.service.ts
export class StripeService {
  createCustomer = jest.fn().mockResolvedValue({
    id: 'cus_mocked123',
    email: 'test@example.com',
  });

  // mock other methods you use in CompanyService here...
}
