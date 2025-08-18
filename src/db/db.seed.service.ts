// src/db/db.seed.service.ts
import { Service } from "typedi";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  startOfDay,
  subDays,
  addDays,
  getTime,
  subMonths,
  startOfToday,
} from "date-fns";

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
import { DailyCriterionMetricModel } from "../models/entities/daily.criterion.metric.entity";
import { DailyReviewMetricModel } from "../models/entities/daily.review.metric.entity";
import { DailyTeamMetricModel } from "../models/entities/daily.team.metrics.entity";
import { DailySentimentLabelMetricModel } from "../models/entities/daily.sentiment.label.metric";

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

      const daysInYear = 365;
      const metricsStartDate = startOfDay(subDays(startOfToday(), daysInYear));
      const criterionNames = criteria.map((c) => c.title);

      // Define trend pattern for overall scores (0-10 scale)
      const trendPattern = [
        { start: 0, end: 90, from: 5.0, to: 7.0 }, // Q1: 50% → 70%
        { start: 90, end: 180, from: 7.0, to: 5.4 }, // Q2: 70% → 54%
        { start: 180, end: 270, from: 5.4, to: 6.0 }, // Q3: 54% → 60%
        { start: 270, end: 365, from: 6.0, to: 8.0 }, // Q4: 60% → 80%
      ];

      // Create daily metrics for the last year
      for (let d = 0; d <= daysInYear; d++) {
        const currentDate = startOfDay(addDays(metricsStartDate, d));
        const dayOfWeek = currentDate.getDay();

        // Determine review volume - more on weekdays
        let reviewCount = 0;
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Weekdays
          reviewCount = faker.number.int({ min: 3, max: 12 });
        } else if (d % 4 === 0) {
          // Occasional weekend reviews
          reviewCount = faker.number.int({ min: 1, max: 3 });
        }

        if (reviewCount > 0) {
          // Calculate trend position
          const progress = d / daysInYear;

          // Find current trend segment
          const segment =
            trendPattern.find((s) => d >= s.start && d <= s.end) ||
            trendPattern[0];
          const segmentProgress =
            (d - segment.start) / (segment.end - segment.start);

          // Base scores with trend
          const baseOverall =
            segment.from + (segment.to - segment.from) * segmentProgress;
          const baseSentiment = 5.5 + 3.0 * progress; // Sentiment improves over year

          // Add daily variation (±15%)
          const dailyOverall =
            baseOverall * faker.number.float({ min: 0.85, max: 1.15 });
          const dailySentiment =
            baseSentiment * faker.number.float({ min: 0.9, max: 1.1 });

          // Cap scores at 10
          const overall = Math.min(dailyOverall, 10);
          const sentiment = Math.min(dailySentiment, 10);

          await DailyReviewMetricModel.create({
            companyId: company._id,
            date: currentDate,
            avgOverall: parseFloat(overall.toFixed(2)),
            avgSentiment: parseFloat(sentiment.toFixed(2)),
            reviewCount,
          });

          const sentimentDistribution = {
            negative: Math.floor(reviewCount * 0.15),
            neutral: Math.floor(reviewCount * 0.25),
            positive:
              reviewCount -
              Math.floor(reviewCount * 0.15) -
              Math.floor(reviewCount * 0.25),
          };

          await DailySentimentLabelMetricModel.create({
            date: currentDate,
            ...sentimentDistribution,
            total: reviewCount,
          });

          // Create criteria metrics with individual trends
          for (const criterion of criterionNames) {
            // Criterion-specific variation (±20% from overall)
            const criterionVariation = faker.number.float({
              min: 0.8,
              max: 1.2,
            });
            let criterionScore = overall * criterionVariation;

            // Add special trends for specific criteria
            if (criterion === "Empathie") {
              criterionScore *= faker.number.float({ min: 0.95, max: 1.15 });
            } else if (criterion === "Professionaliteit") {
              criterionScore *= faker.number.float({ min: 1.05, max: 1.25 });
            }

            criterionScore = Math.min(criterionScore, 10);

            await DailyCriterionMetricModel.create({
              companyId: company._id,
              criterionName: criterion,
              date: currentDate,
              avgScore: parseFloat(criterionScore.toFixed(2)),
              reviewCount,
            });
          }
        }
      }

      // Create daily metrics for the last year
      for (let d = 0; d <= daysInYear; d++) {
        const currentDate = startOfDay(addDays(metricsStartDate, d));
        const dayOfWeek = currentDate.getDay();

        // Determine review volume - more on weekdays
        let reviewCount = 0;
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Weekdays
          reviewCount = faker.number.int({ min: 3, max: 12 });
        } else if (d % 4 === 0) {
          // Occasional weekend reviews
          reviewCount = faker.number.int({ min: 1, max: 3 });
        }

        if (reviewCount > 0) {
          // Calculate trend position
          const progress = d / daysInYear;

          // Find current trend segment
          const segment =
            trendPattern.find((s) => d >= s.start && d <= s.end) ||
            trendPattern[0];
          const segmentProgress =
            (d - segment.start) / (segment.end - segment.start);

          // Base scores with trend
          const baseOverall =
            segment.from + (segment.to - segment.from) * segmentProgress;
          const baseSentiment = 5.5 + 3.0 * progress; // Sentiment improves over year

          // Add daily variation (±15%)
          const dailyOverall =
            baseOverall * faker.number.float({ min: 0.85, max: 1.15 });
          const dailySentiment =
            baseSentiment * faker.number.float({ min: 0.9, max: 1.1 });

          // Cap scores at 10
          const overall = Math.min(dailyOverall, 10);
          const sentiment = Math.min(dailySentiment, 10);

          await DailyReviewMetricModel.create({
            companyId: company._id,
            date: currentDate,
            avgOverall: parseFloat(overall.toFixed(2)),
            avgSentiment: parseFloat(sentiment.toFixed(2)),
            reviewCount,
          });

          // Create criteria metrics with individual trends
          for (const criterion of criterionNames) {
            // Criterion-specific variation (±20% from overall)
            const criterionVariation = faker.number.float({
              min: 0.8,
              max: 1.2,
            });
            let criterionScore = overall * criterionVariation;

            // Add special trends for specific criteria
            if (criterion === "Empathie") {
              criterionScore *= faker.number.float({ min: 0.95, max: 1.15 });
            } else if (criterion === "Professionaliteit") {
              criterionScore *= faker.number.float({ min: 1.05, max: 1.25 });
            }

            criterionScore = Math.min(criterionScore, 10);

            await DailyCriterionMetricModel.create({
              companyId: company._id,
              criterionName: criterion,
              date: currentDate,
              avgScore: parseFloat(criterionScore.toFixed(2)),
              reviewCount,
            });
          }
        }
      }

      // ========== ADD DAILY TEAM METRICS ==========
      // Define team-specific performance patterns
      const teamPatterns = [
        {
          name: "Sales",
          overallTrend: { min: 6.5, max: 8.5 },
          sentimentTrend: { min: 7.0, max: 8.8 },
          volatility: 0.8,
        },
        {
          name: "Support",
          overallTrend: { min: 7.0, max: 8.0 },
          sentimentTrend: { min: 6.5, max: 8.5 },
          volatility: 0.6,
        },
        {
          name: "Success",
          overallTrend: { min: 7.5, max: 9.0 },
          sentimentTrend: { min: 7.5, max: 9.0 },
          volatility: 0.7,
        },
      ];

      // Create daily team metrics for each team
      for (const team of teams) {
        const teamPattern =
          teamPatterns.find((t) => t.name === team.name) || teamPatterns[0];

        for (let d = 0; d <= daysInYear; d++) {
          const currentDate = startOfDay(addDays(metricsStartDate, d));
          const dayOfWeek = currentDate.getDay();

          // Determine review volume - more on weekdays
          let reviewCount = 0;
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Weekdays
            reviewCount = faker.number.int({ min: 1, max: 4 });
          } else if (d % 7 === 0) {
            // Occasional weekend reviews
            reviewCount = faker.number.int({ min: 0, max: 1 });
          }

          if (reviewCount > 0) {
            // Calculate trend position
            const progress = d / daysInYear;

            // Team-specific base scores
            const baseOverall =
              teamPattern.overallTrend.min +
              (teamPattern.overallTrend.max - teamPattern.overallTrend.min) *
                progress;

            const baseSentiment =
              teamPattern.sentimentTrend.min +
              (teamPattern.sentimentTrend.max -
                teamPattern.sentimentTrend.min) *
                progress;

            // Add daily variation based on team volatility
            const dailyOverall =
              baseOverall *
              faker.number.float({
                min: 1 - teamPattern.volatility * 0.1,
                max: 1 + teamPattern.volatility * 0.1,
              });

            const dailySentiment =
              baseSentiment *
              faker.number.float({
                min: 1 - teamPattern.volatility * 0.1,
                max: 1 + teamPattern.volatility * 0.1,
              });

            // Cap scores at 10
            const overall = Math.min(dailyOverall, 10);
            const sentiment = Math.min(dailySentiment, 10);

            await DailyTeamMetricModel.create({
              teamId: team._id,
              date: currentDate,
              avgOverall: parseFloat(overall.toFixed(2)),
              avgSentiment: parseFloat(sentiment.toFixed(2)),
              reviewCount,
            });
          }
        }
      }
      // ========== END DAILY TEAM METRICS ==========

      // 10. Create 100 demo transcripts and reviews
      const transcripts = [];
      const reviews = [];

      for (let i = 0; i < 100; i++) {
        // Random user index (0-9)
        const userIndex = faker.number.int({ min: 0, max: 9 });
        const employee = users[userIndex];

        // Random team (80% chance)
        const team = faker.datatype.boolean(0.8)
          ? faker.helpers.arrayElement(teams)
          : null;

        // Random contact (50% chance)
        const contact = faker.datatype.boolean()
          ? faker.helpers.arrayElement(contacts)
          : null;

        // Random external company (50% chance if contact exists)
        let externalCompany = null;
        if (contact) {
          externalCompany = contact.externalCompanyId;
        } else if (faker.datatype.boolean()) {
          externalCompany = faker.helpers.arrayElement(externalCompanies)._id;
        }

        // Generate random conversation content
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

        // Random date in the past year
        const startDate = faker.date.between({
          from: subMonths(new Date(), 12),
          to: new Date(),
        });
        const duration = faker.number.int({ min: 5, max: 60 }); // minutes
        const endDate = new Date(startDate.getTime() + duration * 60000);

        // Create transcript
        const transcript = await TranscriptModel.create({
          employeeId: employee._id,
          companyId: company._id,
          externalCompanyId: externalCompany,
          contactId: contact?._id,
          teamId: team?._id, // Add team reference
          content: content,
          timestamp: startDate,
          timestampEnd: endDate,
          uploadedById: faker.helpers.arrayElement(users)._id,
          reviewStatus: ReviewStatus.REVIEWED,
          isReviewed: true,
        });
        transcripts.push(transcript);

        // Create corresponding review
        const reviewType = faker.helpers.arrayElement([
          "performance",
          "sentiment",
          "both",
        ]);

        // Create realistic scores based on team performance
        let overallScore = 0;
        let sentimentScore = 0;

        if (team) {
          // Find team pattern
          const teamPattern =
            teamPatterns.find((t) => t.name === team.name) || teamPatterns[0];

          // Calculate base score based on team pattern
          const progress =
            (startDate.getTime() - metricsStartDate.getTime()) /
            (365 * 24 * 60 * 60 * 1000);

          overallScore =
            teamPattern.overallTrend.min +
            (teamPattern.overallTrend.max - teamPattern.overallTrend.min) *
              progress;

          sentimentScore =
            teamPattern.sentimentTrend.min +
            (teamPattern.sentimentTrend.max - teamPattern.sentimentTrend.min) *
              progress;

          // Add individual variation
          overallScore *= faker.number.float({ min: 0.9, max: 1.1 });
          sentimentScore *= faker.number.float({ min: 0.9, max: 1.1 });

          // Cap scores at 10
          overallScore = Math.min(overallScore, 10);
          sentimentScore = Math.min(sentimentScore, 10);
        } else {
          // No team - use company average
          overallScore = faker.number.float({ min: 6.0, max: 8.5 });
          sentimentScore = faker.number.float({ min: 6.5, max: 8.8 });
        }

        const criteriaScores =
          reviewType !== "sentiment"
            ? criteria.map((criterion) => ({
                criterionName: criterion.title,
                criterionDescription: criterion.description,
                score: faker.number.float({
                  min: overallScore * 0.8,
                  max: overallScore * 1.2,
                }),
                comment: faker.lorem.sentence(),
                quote: faker.lorem.sentence(),
                feedback: faker.lorem.sentence(),
              }))
            : [];

        const sentimentLabels = ["negative", "neutral", "positive"];

        await ReviewModel.create({
          transcriptId: transcript._id,
          reviewConfig:
            reviewType !== "sentiment" ? defaultReviewConfig._id : undefined,
          reviewStatus: ReviewStatus.REVIEWED,
          type: reviewType,
          subject: `Review for conversation on ${startDate.toLocaleDateString()}`,
          criteriaScores: criteriaScores,
          overallScore:
            reviewType !== "sentiment"
              ? parseFloat(overallScore.toFixed(2))
              : 0,
          overallFeedback: faker.lorem.paragraph(),
          sentimentScore:
            reviewType !== "performance"
              ? parseFloat(sentimentScore.toFixed(2))
              : undefined,
          sentimentLabel:
            reviewType !== "performance"
              ? faker.helpers.arrayElement(sentimentLabels)
              : undefined,
          sentimentAnalysis:
            reviewType !== "performance" ? faker.lorem.paragraph() : undefined,
          externalCompanyId: transcript.externalCompanyId,
          employeeId: transcript.employeeId,
          teamId: transcript.teamId, // Add team reference
          contactId: transcript.contactId,
          companyId: company._id,
        });
      }

      // 9. Create plan
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

      // 10. Create refresh token
      await RefreshTokenModel.create({
        userId: users[0]._id,
        token: faker.string.alphanumeric(64),
        expiresAt: faker.date.future(),
        ip: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
      });

      // 11. Create reset token
      await ResetTokenModel.create({
        userId: users[0]._id,
        tokenHash: faker.string.alphanumeric(64),
        expiresAt: faker.date.future(),
      });

      // 12. Create pending company
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

      logger.info("Database seeding completed successfully with metrics data");
      return true;
    } catch (error) {
      logger.error("Database seeding failed:", error);
      return false;
    }
  }
}
