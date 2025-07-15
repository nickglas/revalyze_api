// import { Service } from "typedi";
// import { logger } from "../utils/logger";
// import { SeededPlan } from "./db.seed.plans";
// import { StripeService } from "../services/stripe.service";

// @Service()
// export class CompanySeederService {
//   constructor(private readonly stripeService: StripeService) {}

//   async seedCompanies(plans: SeededPlan[]): Promise<
//     Record<
//       string,
//       {
//         customerId: string;
//         subscriptionId: string;
//         priceId: string;
//         planName: string;
//       }
//     >
//   > {
//     const companiesToSeed = [
//       {
//         name: "Revalyze",
//         email: "info@revalyze.io",
//         tier: 3,
//       },
//       {
//         name: "CoolBlue",
//         email: "contact@coolblue.nl",
//         tier: 2,
//       },
//     ];

//     const result: Record<string, any> = {};

//     for (const company of companiesToSeed) {
//       const existingCustomer = await this.stripeService.findCustomerByName(
//         company.name
//       );

//       if (existingCustomer) {
//         logger.info(
//           `Skipping ${company.name} — customer already exists in Stripe`
//         );
//         continue;
//       }

//       const plan = plans.find((p) => p.tier === company.tier);
//       const monthlyPrice = plan?.prices.find((p) => p.interval === "month");

//       if (!plan || !monthlyPrice) {
//         logger.warn(
//           `No plan found for tier ${company.tier}, skipping ${company.name}`
//         );
//         continue;
//       }

//       const customer = await this.stripeService.createCustomer(
//         company.email,
//         company.name
//       );
//       const subscription = await this.stripeService.createSubscription(
//         customer.id,
//         monthlyPrice.priceId,
//         "allow_incomplete"
//       );

//       logger.info(
//         `Created Stripe customer & subscription for "${company.name}" (${plan.name})`
//       );

//       result[company.name] = {
//         customerId: customer.id,
//         subscriptionId: subscription.id,
//         priceId: monthlyPrice.priceId,
//         planName: plan.name,
//       };
//     }

//     return result;
//   }
// }
