// src/db/db.seed.service.ts
import { Service } from "typedi";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { subMonths } from "date-fns";

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
            "Analyseer het algemene sentiment van de klant tijdens het gesprek. Was de toon positief, neutraal or negatief? En hoe ontwikkelde dit sentiment zich tijdens het gesprek?",
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

      // Define team-specific performance patterns
      const teamPatterns = [
        {
          name: "Sales",
          overallTrend: { min: 6.5, max: 8.5 },
          sentimentTrend: { min: 7.0, max: 8.8 },
        },
        {
          name: "Support",
          overallTrend: { min: 7.0, max: 8.0 },
          sentimentTrend: { min: 6.5, max: 8.5 },
        },
        {
          name: "Success",
          overallTrend: { min: 7.5, max: 9.0 },
          sentimentTrend: { min: 7.5, max: 9.0 },
        },
      ];

      // 9. Create specific test reviews with known scores for testing
      const testReviews = [
        // Performance reviews (only overall scores)
        {
          type: "performance" as const,
          overallScore: 8.5,
          sentimentScore: null,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 8.5,
            comment: "Excellent performance",
            quote: "Customer was very satisfied",
            feedback: "Keep up the good work",
          })),
        },
        {
          type: "performance" as const,
          overallScore: 7.2,
          sentimentScore: null,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 7.2,
            comment: "Good performance",
            quote: "Customer was satisfied",
            feedback: "Solid performance",
          })),
        },
        {
          type: "performance" as const,
          overallScore: 6.8,
          sentimentScore: null,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 6.8,
            comment: "Average performance",
            quote: "Customer was neutral",
            feedback: "Room for improvement",
          })),
        },
        {
          type: "performance" as const,
          overallScore: 9.1,
          sentimentScore: null,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 9.1,
            comment: "Outstanding performance",
            quote: "Customer was extremely satisfied",
            feedback: "Exceptional work",
          })),
        },
        {
          type: "performance" as const,
          overallScore: 5.5,
          sentimentScore: null,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 5.5,
            comment: "Below average performance",
            quote: "Customer was somewhat dissatisfied",
            feedback: "Needs improvement",
          })),
        },

        // Sentiment reviews (only sentiment scores)
        {
          type: "sentiment" as const,
          overallScore: 0,
          sentimentScore: 8.7,
          criteriaScores: [],
        },
        {
          type: "sentiment" as const,
          overallScore: 0,
          sentimentScore: 7.4,
          criteriaScores: [],
        },
        {
          type: "sentiment" as const,
          overallScore: 0,
          sentimentScore: 6.2,
          criteriaScores: [],
        },
        {
          type: "sentiment" as const,
          overallScore: 0,
          sentimentScore: 9.3,
          criteriaScores: [],
        },
        {
          type: "sentiment" as const,
          overallScore: 0,
          sentimentScore: 5.9,
          criteriaScores: [],
        },

        // Both types (both scores)
        {
          type: "both" as const,
          overallScore: 8.2,
          sentimentScore: 8.5,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 8.2,
            comment: "Good performance with positive sentiment",
            quote: "Customer was happy with the service",
            feedback: "Well done",
          })),
        },
        {
          type: "both" as const,
          overallScore: 7.8,
          sentimentScore: 7.6,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 7.8,
            comment: "Solid performance with good sentiment",
            quote: "Customer was satisfied overall",
            feedback: "Good job",
          })),
        },
        {
          type: "both" as const,
          overallScore: 6.5,
          sentimentScore: 6.8,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 6.5,
            comment: "Average performance with neutral sentiment",
            quote: "Customer had mixed feelings",
            feedback: "Could be better",
          })),
        },
        {
          type: "both" as const,
          overallScore: 9.0,
          sentimentScore: 9.2,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 9.0,
            comment: "Excellent performance with very positive sentiment",
            quote: "Customer was thrilled",
            feedback: "Outstanding work",
          })),
        },
        {
          type: "both" as const,
          overallScore: 5.8,
          sentimentScore: 5.5,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 5.8,
            comment: "Below average performance with negative sentiment",
            quote: "Customer was disappointed",
            feedback: "Needs significant improvement",
          })),
        },
        {
          type: "both" as const,
          overallScore: 8.7,
          sentimentScore: 8.9,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 8.7,
            comment: "Very good performance with positive sentiment",
            quote: "Customer was very pleased",
            feedback: "Great work",
          })),
        },
        {
          type: "both" as const,
          overallScore: 7.3,
          sentimentScore: 7.1,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 7.3,
            comment: "Good performance with slightly positive sentiment",
            quote: "Customer was generally satisfied",
            feedback: "Keep it up",
          })),
        },
        {
          type: "both" as const,
          overallScore: 6.9,
          sentimentScore: 6.7,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 6.9,
            comment: "Average performance with neutral sentiment",
            quote: "Customer had no strong feelings",
            feedback: "Room for growth",
          })),
        },
        {
          type: "both" as const,
          overallScore: 8.9,
          sentimentScore: 9.1,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 8.9,
            comment: "Excellent performance with very positive sentiment",
            quote: "Customer was extremely happy",
            feedback: "Exceptional service",
          })),
        },
        {
          type: "both" as const,
          overallScore: 6.2,
          sentimentScore: 5.9,
          criteriaScores: criteria.map((c) => ({
            criterionName: c.title,
            criterionDescription: c.description,
            score: 6.2,
            comment:
              "Below average performance with somewhat negative sentiment",
            quote: "Customer had some issues",
            feedback: "Needs attention",
          })),
        },
      ];

      // Create test reviews with specific dates to test time filters
      for (let i = 0; i < testReviews.length; i++) {
        const reviewData = testReviews[i];

        // Create dates spread across different time periods
        let startDate;
        if (i < 5) {
          // First 5 reviews: within last week
          startDate = faker.date.between({
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            to: new Date(),
          });
        } else if (i < 10) {
          // Next 5 reviews: within last month
          startDate = faker.date.between({
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            to: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          });
        } else {
          // Last 10 reviews: within last 3 months
          startDate = faker.date.between({
            from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          });
        }

        const duration = faker.number.int({ min: 5, max: 60 });
        const endDate = new Date(startDate.getTime() + duration * 60000);

        // Random employee, team, and contact
        const employee = faker.helpers.arrayElement(users);
        const team = faker.datatype.boolean(0.8)
          ? faker.helpers.arrayElement(teams)
          : null;
        const contact = faker.datatype.boolean()
          ? faker.helpers.arrayElement(contacts)
          : null;
        const externalCompany = contact
          ? contact.externalCompanyId
          : faker.datatype.boolean()
          ? faker.helpers.arrayElement(externalCompanies)._id
          : null;

        // Generate conversation content
        const content = Array.from({
          length: faker.number.int({ min: 5, max: 15 }),
        })
          .map(() => {
            const speaker = faker.datatype.boolean() ? "Agent" : "Customer";
            return `${speaker}: ${faker.lorem.sentences(
              faker.number.int({ min: 1, max: 3 })
            )}`;
          })
          .join("\n\n");

        // Create transcript
        const transcript = await TranscriptModel.create({
          employeeId: employee._id,
          companyId: company._id,
          externalCompanyId: externalCompany,
          contactId: contact?._id,
          teamId: team?._id,
          content: content,
          timestamp: startDate,
          timestampEnd: endDate,
          uploadedById: faker.helpers.arrayElement(users)._id,
          reviewStatus: ReviewStatus.REVIEWED,
          isReviewed: true,
        });

        // Create review
        await ReviewModel.create({
          transcriptId: transcript._id,
          reviewConfig:
            reviewData.type !== "sentiment"
              ? defaultReviewConfig._id
              : undefined,
          reviewStatus: ReviewStatus.REVIEWED,
          type: reviewData.type,
          subject: `Test review ${i + 1} - ${reviewData.type}`,
          criteriaScores: reviewData.criteriaScores,
          overallScore: reviewData.overallScore,
          overallFeedback: `Test feedback for review ${i + 1}`,
          sentimentScore: reviewData.sentimentScore,
          sentimentLabel: reviewData.sentimentScore
            ? reviewData.sentimentScore >= 8
              ? "positive"
              : reviewData.sentimentScore >= 6
              ? "neutral"
              : "negative"
            : undefined,
          sentimentAnalysis: reviewData.sentimentScore
            ? `Sentiment analysis for test review ${i + 1}`
            : undefined,
          externalCompanyId: externalCompany,
          employeeId: employee._id,
          teamId: team?._id,
          contactId: contact?._id,
          companyId: company._id,
          createdAt: startDate,
          updatedAt: startDate,
        });
      }

      // 10. Create plan
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

      // 11. Create refresh token
      await RefreshTokenModel.create({
        userId: users[0]._id,
        token: faker.string.alphanumeric(64),
        expiresAt: faker.date.future(),
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
      });

      // 12. Create reset token
      await ResetTokenModel.create({
        userId: users[0]._id,
        tokenHash: faker.string.alphanumeric(64),
        expiresAt: faker.date.future(),
      });

      // 13. Create pending company
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
      console.warn(error);
      return false;
    }
  }
}
