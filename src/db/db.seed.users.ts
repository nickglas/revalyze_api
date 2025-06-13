import User, { IUser } from '../models/user.model';

export async function seedUsers() {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('Users already seeded');
    return;
  }

  const users: Partial<IUser>[] = [
    {
      email: 'nick@revalyze.io',
      password: 'Welkom123!',
			name: "Nick Glas",
			companyId: "Revalyze",
			isActive: true,
      role: 'super_admin',
    },
    {
      email: 'gijs@revalyze.io',
      password: 'Welkom123!',
			name: "Gijs Hamburger",
			companyId: "Revalyze",
			isActive: true,
      role: 'super_admin',
    },
    {
      email: 'companyadmin@example.com',
      password: 'company123',
			name: "Company Admin",
			companyId: "CoolBlue",
			isActive: true,
      role: 'company_admin',
    },
    {
      email: 'employee@example.com',
      password: 'employee123',
      role: 'employee',
			name: "Company employee",
			companyId: "CoolBlue",
			isActive: false,
    },
  ];

  for (const userData of users) {
    const user = new User(userData);
    await user.save();
  }

  console.log('Users seeded successfully');
}
