// src/db/db.seed.service.ts
import { Service } from "typedi";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

import { logger } from "../utils/logger";
import { CompanyModel } from "../models/entities/company.entity";
import { SubscriptionModel } from "../models/entities/subscription.entity";
import { UserModel } from "../models/entities/user.entity";
import { TeamModel } from "../models/entities/team.entity";
import { ExternalCompanyModel } from "../models/entities/external.company.entity";
import { ContactModel } from "../models/entities/contact.entity";
import { CriterionModel } from "../models/entities/criterion.entity";
import { ReviewConfigModel } from "../models/entities/review.config.entity";
import { TranscriptModel } from "../models/entities/transcript.entity";
import { ReviewModel } from "../models/entities/review.entity";
import { PlanModel } from "../models/entities/plan.entity";
import { RefreshTokenModel } from "../models/entities/refresh.token.entity";
import { ResetTokenModel } from "../models/entities/reset.token.entity";
import { PendingCompanyModel } from "../models/entities/pending.company.entity";
import { ReviewStatus } from "../models/types/transcript.type";

@Service()
export class SeedService {
  public async isDatabaseEmpty(): Promise<boolean> {
    const companyCount = await CompanyModel.countDocuments();
    return companyCount === 0;
  }

  public async seedFullEnvironment(): Promise<boolean> {
    try {
      // 1. Create company
      const company = await CompanyModel.create({
        name: "Acme Corporation",
        mainEmail: "info@acme.com",
        phone: faker.phone.number(),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zip: faker.location.zipCode(),
          country: faker.location.country(),
        },
        stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
        isActive: true,
      });

      // 2. Create subscription
      await SubscriptionModel.create({
        companyId: company._id,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: faker.date.future(),
        priceId: `price_${faker.string.alphanumeric(14)}`,
        productId: `prod_${faker.string.alphanumeric(14)}`,
        productName: "Premium Plan",
        amount: 2990,
        currency: "eur",
        interval: "month",
        allowedUsers: 25,
        allowedTranscripts: 500,
        allowedReviews: 1000,
        tier: 2,
      });

      // 3. Create users
      const users = [];
      const password = await bcrypt.hash("Password123!", 10);

      // Admin user
      const admin = await UserModel.create({
        email: "admin@acme.com",
        name: "Admin User",
        password,
        companyId: company._id,
        role: "company_admin",
        isActive: true,
      });
      users.push(admin);

      // Regular users
      for (let i = 0; i < 9; i++) {
        const user = await UserModel.create({
          email: faker.internet.email(),
          name: faker.person.fullName(),
          password,
          companyId: company._id,
          role: "employee",
          isActive: true,
        });
        users.push(user);
      }

      // 4. Create teams
      const teams = [];
      const teamNames = ["Sales", "Support", "Success"];

      for (const name of teamNames) {
        const team = await TeamModel.create({
          name,
          description: `${name} team at Acme Corp`,
          isActive: true,
          companyId: company._id,
          users: [
            { user: users[0]._id, isManager: true },
            { user: users[1]._id, isManager: false },
            { user: users[2]._id, isManager: false },
          ],
        });
        teams.push(team);
      }

      // 5. Create external companies
      const externalCompanies = [];
      for (let i = 0; i < 2; i++) {
        const extCompany = await ExternalCompanyModel.create({
          name: faker.company.name(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          isActive: true,
          companyId: company._id,
        });
        externalCompanies.push(extCompany);
      }

      // 6. Create contacts
      const contacts = [];
      for (let i = 0; i < 10; i++) {
        const contact = await ContactModel.create({
          externalCompanyId: faker.helpers.arrayElement(externalCompanies)._id,
          companyId: company._id,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          position: faker.person.jobTitle(),
          isActive: true,
        });
        contacts.push(contact);
      }

      // 7. Create criteria
      const criteria = [];
      const criterionNames = [
        "Product Knowledge",
        "Communication",
        "Problem Solving",
        "Empathy",
        "Efficiency",
        "Professionalism",
        "Technical Skills",
        "Collaboration",
        "Adaptability",
        "Leadership",
      ];

      for (const name of criterionNames) {
        const criterion = await CriterionModel.create({
          companyId: company._id,
          title: name,
          description: `Evaluation of ${name.toLowerCase()}`,
          isActive: true,
        });
        criteria.push(criterion);
      }

      // 8. Create review configs
      const reviewConfigs = [];
      for (let i = 0; i < 2; i++) {
        const config = await ReviewConfigModel.create({
          name: `Review Config ${i + 1}`,
          companyId: company._id,
          isActive: true,
          criteriaIds: criteria.slice(0, 5).map((c) => c._id),
          modelSettings: {
            temperature: 0.7,
            maxTokens: 2000,
          },
        });
        reviewConfigs.push(config);
      }

      // 9. Create transcripts
      const transcripts = [];
      for (let i = 0; i < 10; i++) {
        const transcript = await TranscriptModel.create({
          employeeId: faker.helpers.arrayElement(users)._id,
          companyId: company._id,
          externalCompanyId: faker.helpers.arrayElement(externalCompanies)._id,
          contactId: faker.helpers.arrayElement(contacts)._id,
          content: faker.lorem.paragraphs(3),
          timestamp: faker.date.recent(),
          uploadedById: admin._id,
          reviewStatus: ReviewStatus.NOT_STARTED,
          isReviewed: false,
        });
        transcripts.push(transcript);
      }

      // 10. Create reviews
      for (let i = 0; i < 4; i++) {
        const transcript = faker.helpers.arrayElement(transcripts);

        await ReviewModel.create({
          transcriptId: transcript._id,
          reviewConfig: reviewConfigs[i % 2].toObject(),
          reviewStatus: ReviewStatus.REVIEWED,
          type: "both",
          criteriaScores: [
            {
              criterionName: "Product Knowledge",
              criterionDescription: "Knowledge of products",
              score: faker.number.float({ min: 7, max: 10 }),
              comment: faker.lorem.sentence(),
              quote: faker.lorem.sentence(),
              feedback: faker.lorem.paragraph(),
            },
            {
              criterionName: "Communication",
              criterionDescription: "Communication skills",
              score: faker.number.float({ min: 7, max: 10 }),
              comment: faker.lorem.sentence(),
              quote: faker.lorem.sentence(),
              feedback: faker.lorem.paragraph(),
            },
          ],
          overallScore: faker.number.float({ min: 7, max: 10 }),
          overallFeedback: faker.lorem.paragraph(),
          sentimentScore: faker.number.float({ min: 7, max: 10 }),
          sentimentLabel: "positive",
          sentimentAnalysis: faker.lorem.paragraph(),
          externalCompanyId: transcript.externalCompanyId,
          employeeId: transcript.employeeId,
          clientId: transcript.contactId,
          companyId: company._id,
        });
      }

      // 11. Create plan
      await PlanModel.create({
        name: "Premium Plan",
        description: "Premium subscription plan",
        stripeProductId: `prod_${faker.string.alphanumeric(14)}`,
        currency: "eur",
        billingOptions: [
          {
            interval: "month",
            stripePriceId: `price_${faker.string.alphanumeric(14)}`,
            amount: 2990,
            tier: 2,
          },
          {
            interval: "year",
            stripePriceId: `price_${faker.string.alphanumeric(14)}`,
            amount: 29900,
            tier: 2,
          },
        ],
        allowedUsers: 25,
        allowedTranscripts: 500,
        allowedReviews: 1000,
        isActive: true,
        isVisible: true,
        features: [
          "Unlimited reviews",
          "Priority support",
          "Advanced analytics",
        ],
      });

      // 12. Create refresh token
      await RefreshTokenModel.create({
        userId: users[0]._id,
        token: faker.string.alphanumeric(64),
        expiresAt: faker.date.future(),
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
      });

      // 13. Create reset token
      await ResetTokenModel.create({
        userId: users[0]._id,
        tokenHash: faker.string.alphanumeric(64),
        expiresAt: faker.date.future(),
      });

      // 14. Create pending company
      await PendingCompanyModel.create({
        stripeSessionId: `cs_${faker.string.alphanumeric(24)}`,
        stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
        stripePaymentLink: faker.internet.url(),
        stripeSessionExpiresAtTimestamp: Date.now() + 3600000,
        companyName: "Pending Company Inc",
        companyMainEmail: "pending@company.com",
        companyPhone: faker.phone.number(),
        address: faker.location.streetAddress(),
        adminName: faker.person.fullName(),
        adminEmail: faker.internet.email(),
        password: await bcrypt.hash("Password123!", 10),
      });

      logger.info("Database seeding completed successfully");
      return true;
    } catch (error) {
      logger.error("Database seeding failed:", error);
      return false;
    }
  }
}
