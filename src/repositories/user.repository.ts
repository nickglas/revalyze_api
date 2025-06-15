import { Service } from 'typedi';
import User, { IUser } from '../models/user.model';

@Service()
export class UserRepository {
  async findByEmail(email: string) {
    return User.findOne({ email });
  }

  async findById(id: string) {
    return User.findById(id);
  }

  async create(userData: Partial<IUser>) {
    return User.create(userData);
  }
}