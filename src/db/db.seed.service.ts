// src/db/db.seed.service.ts
import { Service } from "typedi";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

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

      // Calculate dates for subscription
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      const scheduledDowngradeDate = new Date(currentPeriodEnd);
      scheduledDowngradeDate.setDate(scheduledDowngradeDate.getDate() - 3);

      // 2. Create subscription with downgrade
      await SubscriptionModel.create({
        companyId: company._id,
        status: "active",
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
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
        cancelAtPeriodEnd: true,
        scheduledUpdate: {
          productName: "Standard Plan",
          effectiveDate: scheduledDowngradeDate,
          priceId: `price_${faker.string.alphanumeric(14)}`,
          productId: `prod_${faker.string.alphanumeric(14)}`,
          amount: 1490,
          interval: "month",
          allowedUsers: 10,
          allowedTranscripts: 200,
          allowedReviews: 500,
          tier: 1,
          scheduleId: `sch_${faker.string.alphanumeric(14)}`,
        },
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

      // 7. Create default criteria
      const defaultCriteriaData = [
        {
          title: "Empathie",
          description:
            "Evalueer of de medewerker blijk gaf van empathie tijdens het gesprek. Let op of de medewerker begrip toont voor de situatie, emotioneel aansluit bij de klant, en oprechte betrokkenheid uitstraalt.",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Oplossingsgerichtheid",
          description:
            "Kijk of de medewerker actief werkte aan het oplossen van het probleem van de klant. Was de geboden oplossing passend? Werd er snel en duidelijk richting een uitkomst gestuurd?",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Professionaliteit",
          description:
            "Beoordeel of de medewerker professioneel overkwam. Let op taalgebruik, toon, houding en consistentie. Was het gesprek beleefd, respectvol en zakelijk waar nodig?",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Klanttevredenheid",
          description:
            "Analyseer hoe tevreden de klant waarschijnlijk was aan het einde van de interactie. Gebruik signalen in de tekst zoals woordkeuze, afsluitende zinnen en toon om een inschatting te maken van de tevredenheid.",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Sentiment klant",
          description:
            "Analyseer het algemene sentiment van de klant tijdens het gesprek. Was de toon positief, neutraal of negatief? En hoe ontwikkelde dit sentiment zich tijdens het gesprek?",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Helderheid en begrijpelijkheid",
          description:
            "Evalueer of de medewerker duidelijke en begrijpelijke taal gebruikte. Werden instructies of informatie op een toegankelijke manier uitgelegd?",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Responsiviteit/luistervaardigheid",
          description:
            "Beoordeel of de medewerker actief luisterde en passend reageerde op de input van de klant. Werden vragen goed beantwoord? Was er sprake van herhaling, bevestiging of doorvragen?",
          isActive: true,
          companyId: company._id,
        },
        {
          title: "Tijdsefficiëntie/doelgerichtheid",
          description:
            "Beoordeel of het gesprek doelgericht verliep. Werden irrelevante uitweidingen vermeden? Was het gesprek effectief in het bereiken van een oplossing zonder onnodige vertraging?",
          isActive: true,
          companyId: company._id,
        },
      ];

      const criteria = [];
      for (const data of defaultCriteriaData) {
        const criterion = await CriterionModel.create(data);
        criteria.push(criterion);
      }

      // 8. Create default review config
      const defaultReviewConfig = await ReviewConfigModel.create({
        name: "Default",
        description: "Default review configuration",
        companyId: company._id,
        isActive: true,
        criteria: criteria.map((c) => ({
          criterionId: c._id,
          weight: 1 / criteria.length, // Equal weight for all criteria
        })),
        modelSettings: {
          temperature: 0.7,
          maxTokens: 1000,
        },
      });

      const reviewConfigs = [defaultReviewConfig];

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
          reviewConfig: defaultReviewConfig.toObject(), // Use default config
          reviewStatus: ReviewStatus.REVIEWED,
          type: "both",
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: faker.number.float({ min: 7, max: 10 }),
            comment: faker.lorem.sentence(),
            quote: faker.lorem.sentence(),
            feedback: faker.lorem.paragraph(),
          })),
          overallScore: faker.number.float({ min: 7, max: 10 }),
          overallFeedback: faker.lorem.paragraph(),
          sentimentScore: faker.number.float({ min: 7, max: 10 }),
          sentimentLabel: "positive",
          sentimentAnalysis: faker.lorem.paragraph(),
          externalCompanyId: transcript.externalCompanyId,
          employeeId: transcript.employeeId,
          contactId: transcript.contactId,
          companyId: company._id,
        });
      }

      // 11. Create plan
      const plans = [
        {
          name: "Starter Plan seed",
          description: "For small teams getting started",
          stripeProductId: `prod_${faker.string.alphanumeric(14)}`,
          currency: "usd",
          billingOptions: [
            {
              interval: "month",
              stripePriceId: `price_${faker.string.alphanumeric(14)}`,
              amount: 4900,
              tier: 1,
            },
          ],
          allowedUsers: 5,
          allowedTranscripts: 100,
          allowedReviews: 50,
          isActive: true,
          isVisible: true,
          features: [
            "5 users",
            "100 transcripts/month",
            "50 reviews/month",
            "Basic support",
          ],
        },
        {
          name: "Business Plan seed",
          description: "For growing businesses",
          stripeProductId: `prod_${faker.string.alphanumeric(14)}`,
          currency: "usd",
          billingOptions: [
            {
              interval: "month",
              stripePriceId: `price_${faker.string.alphanumeric(14)}`,
              amount: 9900,
              tier: 2,
            },
            {
              interval: "year",
              stripePriceId: `price_${faker.string.alphanumeric(14)}`,
              amount: 99000,
              tier: 2,
            },
          ],
          allowedUsers: 10,
          allowedTranscripts: 500,
          allowedReviews: 200,
          isActive: true,
          isVisible: true,
          features: [
            "10 users",
            "500 transcripts/month",
            "200 reviews/month",
            "Priority support",
            "Advanced analytics",
          ],
        },
        {
          name: "Enterprise Plan seed",
          description: "For large organizations",
          stripeProductId: `prod_${faker.string.alphanumeric(14)}`,
          currency: "usd",
          billingOptions: [
            {
              interval: "month",
              stripePriceId: `price_${faker.string.alphanumeric(14)}`,
              amount: 19900,
              tier: 3,
            },
            {
              interval: "year",
              stripePriceId: `price_${faker.string.alphanumeric(14)}`,
              amount: 199000,
              tier: 3,
            },
          ],
          allowedUsers: 10000,
          allowedTranscripts: 2000,
          allowedReviews: 500,
          isActive: true,
          isVisible: true,
          features: [
            "Unlimited users",
            "2000 transcripts/month",
            "500 reviews/month",
            "24/7 premium support",
            "Custom integrations",
          ],
        },
      ];

      for (const planData of plans) {
        await PlanModel.create(planData);
      }

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
