import Company, { ICompany } from '../models/company.model';

export async function seedCompanies(): Promise<Record<string, string>> {
  const companiesToSeed: Partial<ICompany>[] = [
    {
      name: 'Revalyze',
      mainEmail: 'info@revalyze.io',
      stripeCustomerId: 'cus_revalyze_001',
      stripeSubscriptionId: 'sub_revalyze_001',
      isActive: true,
      allowedUsers: 50,
      allowedTranscripts: 1000,
      subscriptionStatus: 'active',
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'CoolBlue',
      mainEmail: 'contact@coolblue.nl',
      stripeCustomerId: 'cus_coolblue_001',
      stripeSubscriptionId: 'sub_coolblue_001',
      isActive: true,
      allowedUsers: 10,
      allowedTranscripts: 100,
      subscriptionStatus: 'active',
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  ];

  const companyIds: Record<string, string> = {};

  for (const companyData of companiesToSeed) {
    let company = await Company.findOne({ name: companyData.name });

    if (!company) {
      company = new Company(companyData);
      await company.save();
      console.log(`Seeded company: ${company.name}`);
    } else {
      console.log(`Company already exists: ${company.name}`);
    }

    companyIds[company.name] = company.id.toString();
  }

  return companyIds;
}
