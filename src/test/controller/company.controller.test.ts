import request from 'supertest';
import app from '../../app';
import Company from '../../models/company.model';
import User from '../../models/user.model';
import refreshTokenModel from '../../models/refreshToken.model';

describe('Company Controller', () => {
  let accessToken: string;
  let companyId: string;

  beforeEach(async () => {
    await Company.deleteMany({});
    await User.deleteMany({});
    await refreshTokenModel.deleteMany({});

    const company = await new Company({
      name: "Revalyze",
      mainEmail: "nickglas@revalyze.io",
      subscriptionPlanId: "plan_pro",
    }).save();
    companyId = company.id;

    const user = await new User({
      email: 'nickglas@revalyze.io',
      password: 'password123',
      role: 'company_admin',
      name: 'Nick',
      companyId: company.id,
      isActive: true,
    }).save();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password123' });
    accessToken = loginRes.body.accessToken;
  });

  describe('GET /api/v1/companies', () => {
    it('should return the company data of own company', async () => {
      const res = await request(app)
        .get(`/api/v1/companies`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'Revalyze');
    });
    it('should return unauthorized when no token is provided', async () => {
      const res = await request(app)
        .get(`/api/v1/companies`)

      expect(res.statusCode).toBe(401);
    });
  });

  // Add tests for POST, PUT, DELETE similarly
});
