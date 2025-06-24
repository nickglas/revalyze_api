import User, { IUser } from '../models/user.model';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export async function seedUsers(companyIds: Record<string, string>) {
  const users: Partial<IUser>[] = [
    // Revalyze
    {
      email: 'nick@revalyze.io',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Nick Glas',
      companyId: new Types.ObjectId(companyIds['Revalyze']),
      isActive: true,
      role: 'super_admin',
    },
    {
      email: 'gijs@revalyze.io',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Gijs Hamburger',
      companyId: new Types.ObjectId(companyIds['Revalyze']),
      isActive: true,
      role: 'super_admin',
    },

    // CoolBlue Admins
    {
      email: 'companyadmin@example.com',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Company Admin',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: true,
      role: 'company_admin',
    },
    {
      email: 'admin.jane@coolblue.nl',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Jane Manager',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: true,
      role: 'company_admin',
    },

    // CoolBlue Employees
    {
      email: 'employee@example.com',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Company Employee',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: false,
      role: 'employee',
    },
    {
      email: 'john.doe@coolblue.nl',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'John Doe',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: true,
      role: 'employee',
    },
    {
      email: 'emily.smith@coolblue.nl',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Emily Smith',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: true,
      role: 'employee',
    },
    {
      email: 'test.user@coolblue.nl',
      password: await bcrypt.hash('Welkom123!', 10),
      name: 'Test User',
      companyId: new Types.ObjectId(companyIds['CoolBlue']),
      isActive: false,
      role: 'employee',
    },
  ];

  for (const userData of users) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`User already exists: ${userData.email}`);
      continue;
    }

    const user = new User(userData);
    await user.save();
    console.log(`Seeded user: ${user.email}`);
  }

  console.log('User seeding complete');
}
