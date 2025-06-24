import { Service, Inject } from 'typedi';
import { UserRepository } from '../repositories/user.repository'
import { IUser } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../utils/errors';

@Service()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  async findByEmail(email: string): Promise<IUser> {
    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async findById(userId: string): Promise<IUser> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    if (!userData.email || !userData.password) {
      throw new BadRequestError('Missing required fields: email or password');
    }

    return this.userRepository.create(userData);
  }

  async countUsersByCompany(companyId: string): Promise<number> {
    if (!companyId) {
      throw new BadRequestError('Company ID is required');
    }

    return this.userRepository.countByCompany(companyId);
  }
}
