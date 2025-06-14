import request from 'supertest';
import app from '../../src/app';
import User from '../../src/models/user.model';

describe('Auth Controller', () => {
  beforeAll(async () => {
    await User.deleteMany({});
    await new User({
      email: 'test@example.com',
      password: 'password123',
      role: 'employee',
      name: 'Test User',
      companyId: 'abc123',
      isActive: true,
    }).save();
  });

  it('should login successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    console.log(res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
  });
});