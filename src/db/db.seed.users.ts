import User, { IUser } from '../models/user.model';
import mongoose, { Types } from 'mongoose';

export async function seedUsers(companyIds: Record<string, string>) {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('Users already seeded');
    return;
  }

  const users: Partial<IUser>[] = [
    {
      email: 'nick@revalyze.io',
      password: 'Welkom123!',
      name: 'Nick Glas',
      companyId: new Types.ObjectId(companyIds['Revalyze']),
      isActive: true,
      role: 'super_admin',
    },
    {
      email: 'gijs@revalyze.io',
      password: 'Welkom123!',
      name: 'Gijs Hamburger',
      companyId: new Types.ObjectId(companyIds['Revalyze']),
      isActive: true,
      role: 'super_admin',
    },
    {
      email: 'companyadmin@example.com',
      password: 'company123',
      name: 'Company Admin',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: true,
      role: 'company_admin',
    },
    {
      email: 'employee@example.com',
      password: 'employee123',
      name: 'Company employee',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: false,
      role: 'employee',
    },
  ];

  for (const userData of users) {
    const user = new User(userData);
    await user.save();
  }

  console.log('Users seeded successfully');
}
