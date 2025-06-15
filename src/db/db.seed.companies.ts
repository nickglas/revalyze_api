import Company, { ICompany } from '../models/company.model';

export async function seedCompanies(): Promise<Record<string, string>> {
  const companiesToSeed: Partial<ICompany>[] = [
    {
      name: 'Revalyze',
      mainEmail: 'info@revalyze.io',
      subscriptionPlanId: 'plan_pro',
    },
    {
      name: 'CoolBlue',
      mainEmail: 'contact@coolblue.nl',
      subscriptionPlanId: 'plan_basic',
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
