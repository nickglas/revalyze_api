import { Types } from "mongoose";
import Company, { ICompany } from "../models/company.model";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { CompanyRepository } from "../repositories/company.repository";
import { StripeService } from "./stripe.service";
import { Service } from "typedi";
import { UserRepository } from "../repositories/user.repository";
import { TranscriptRepository } from "../repositories/transcript.repository";
import pendingCompanyModel from "../models/pendingCompany.model";
import { compareTiers } from "../utils/plan";
import { url } from "inspector";
import Stripe from "stripe";
import Subscription, { ISubscription } from "../models/subscription.model";
import { RegisterCompanyDto } from "../dto/company/register.company.dto";
import { PendingCompanyRepository } from "../repositories/pending.repository";

@Service()
export class CompanyService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly pendingRepository: PendingCompanyRepository
  ) {}

  async registerCompany({
    companyName,
    companyMainEmail,
    companyPhone,
    address,
    subscriptionPlanId,
    adminName,
    adminEmail,
    password,
  }: RegisterCompanyDto) {
    const existing = await this.companyRepository.findOne({
      mainEmail: companyMainEmail,
    });

    if (existing) {
      throw new BadRequestError("Company with this email already exists");
    }

    const user = await this.userRepository.findByEmail(adminEmail);
    if (user) {
      throw new BadRequestError("User with this email is already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Stripe customer
    const customer = await this.stripeService.createCustomer(
      companyMainEmail,
      companyName
    );

    if (!customer?.id) {
      throw new BadRequestError("Failed to create Stripe customer");
    }

    // Create Stripe Checkout session
    const session = await this.stripeService.createCheckoutSession({
      mode: "subscription",
      customer: customer.id,
      line_items: [
        {
          price: subscriptionPlanId ?? "price_1Rax57FNTWq4w3FpEexAMksM",
          quantity: 1,
        },
      ],
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      success_url: "https://www.google.com",
      cancel_url: "https://www.google.com",
    });

    if (!session?.url) {
      throw new BadRequestError("Failed to create Stripe Checkout session");
    }

    try {
      const pending = new pendingCompanyModel({
        stripeSessionId: session.id,
        stripeCustomerId: customer.id,
        stripePaymentLink: session.url,
        stripeSessionExpiresAtTimestamp: session.expires_at,
        companyName,
        companyMainEmail,
        companyPhone,
        address,
        adminName,
        adminEmail,
        password: hashedPassword,
      });

      await this.pendingRepository.create(pending);
    } catch (error) {
      await this.stripeService.deleteCustomer(customer.id);
      throw error;
    }

    return {
      checkoutUrl: session.url,
    };
  }

  async cancelScheduledSubscriptionBySubscription(
    scubscription: ISubscription
  ) {
    if (!scubscription.scheduledUpdate) return;

    const releasedSchedule =
      await this.stripeService.cancelSubscriptionSchedule(
        scubscription.scheduledUpdate.scheduleId
      );

    if (!releasedSchedule || releasedSchedule.status !== "released") {
      throw new BadRequestError("Failed to release subscription schedule");
    }
  }

  async cancelScheduledSubscriptionByCompanyId(companyId: string) {
    const companySubscription = await Subscription.findOne({
      companyId: companyId,
    });

    //check if exists
    if (!companySubscription) throw new BadRequestError("Company not found");

    //check if scheduled exists
    if (!companySubscription.scheduledUpdate)
      throw new BadRequestError("No scheduled subscriptions found");

    //cancel
    return await this.stripeService.cancelSubscriptionSchedule(
      companySubscription.scheduledUpdate.scheduleId
    );
  }

  //cancels the current subscription at the end of the billing cycle. Scheduled downgrades are also cancelled.
  async cancelSubscriptions(companyId: string) {
    //get the active subscription
    const companySubscription = await Subscription.findOne({
      companyId: companyId,
    });

    //check if exists
    if (!companySubscription) throw new BadRequestError("Company not found");

    //cancel the active subscription
    const result = await this.stripeService.cancelSubscription(
      companySubscription.stripeSubscriptionId,
      true
    );

    //check if the subscription is updated
    if (!result || !result.cancel_at_period_end) {
      throw new BadRequestError(
        "Failed to schedule cancellation of subscription."
      );
    }

    //cancel scheduled ones
    return await this.cancelScheduledSubscriptionBySubscription(
      companySubscription
    );
  }

  async getCompanyById(companyId: string) {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestError("Invalid company ID");
    }

    const company = await Company.findById(companyId);

    if (!company) {
      throw new NotFoundError("Company not found");
    }

    return company;
  }

  async updateCompanyById(
    userId: string,
    companyId: string,
    updates: Partial<any>
  ) {
    //validations of id's
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestError("Invalid company or user ID");
    }

    //check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    //check if the user is an admin & the user is actually admin of the specfied company
    if (
      user.role !== "company_admin" ||
      user.companyId.toString() !== companyId
    ) {
      throw new UnauthorizedError("Unauthorized to update this company");
    }

    //check if the fields are valid
    const allowedFields = ["mainEmail", "phone", "address"];
    const filteredUpdates: Partial<any> = {};
    for (const key of allowedFields) {
      if (updates[key]) {
        filteredUpdates[key] = updates[key];
      }
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      filteredUpdates,
      { new: true }
    );
    if (!updatedCompany) {
      throw new NotFoundError("Company not found");
    }

    return updatedCompany;
  }

  async updateSubscription(companyId: string, newPriceId: string) {
    // 1. Find the company
    const company = await Company.findById(companyId);
    if (!company) throw new BadRequestError("Company not found");

    if (!company.stripeSubscriptionId || !company.stripeCustomerId) {
      throw new BadRequestError("Company has no active subscription");
    }

    // 2. Retrieve current subscription
    const subscription = await this.stripeService.getSubscription(
      company.stripeSubscriptionId
    );

    if (!subscription) {
      throw new BadRequestError("No active subscription found");
    }

    const currentPriceId = subscription.items.data[0]?.price.id;
    if (!currentPriceId) throw new BadRequestError("Current price ID missing");

    if (!newPriceId) throw new BadRequestError("New price ID missing");

    const [currentPrice, newPrice] = await Promise.all([
      this.stripeService.getPriceById(currentPriceId),
      this.stripeService.getPriceById(newPriceId),
    ]);

    if (!currentPrice) throw new BadRequestError("Current price not found");
    if (!newPrice) throw new BadRequestError("New price not found");

    const currentProductId = currentPrice.product as string;
    const newProductId = newPrice.product as string;

    if (!currentProductId)
      throw new BadRequestError("Current product ID missing");
    if (!newProductId) throw new BadRequestError("New product ID missing");

    const [currentProduct, newProduct] = await Promise.all([
      this.stripeService.getProductById(currentProductId),
      this.stripeService.getProductById(newProductId),
    ]);

    if (!currentProduct) throw new BadRequestError("Current product not found");
    if (!newProduct) throw new BadRequestError("New product not found");

    // Optionally check for tier metadata existence
    if (!currentProduct.metadata?.tier || !newProduct.metadata?.tier) {
      throw new BadRequestError("Product tier metadata missing");
    }

    const action = compareTiers(
      currentProduct.metadata.tier,
      newProduct.metadata.tier
    );

    switch (action) {
      case "same":
        throw new BadRequestError("Already in the same tier");

      case "downgrade": {
        const item = subscription.items.data[0];
        if (!item) {
          throw new BadRequestError("Subscription item data missing");
        }
        const currentPeriodStart = item.current_period_start;
        const currentPeriodEnd = item.current_period_end;

        if (!currentPeriodStart || !currentPeriodEnd) {
          throw new BadRequestError("Subscription period dates missing");
        }

        // Step 1: Create schedule without phases or end_behavior
        const schedule = await this.stripeService.createSubscriptionSchedule({
          from_subscription: subscription.id,
        });

        if (!schedule || !schedule.id) {
          throw new Error("Failed to create subscription schedule");
        }

        // Step 2: Add downgrade phases and set end_behavior
        const addScheduleResult =
          await this.stripeService.addDowngradePhasesToSchedule(
            schedule.id,
            subscription,
            newPriceId,
            currentPeriodStart,
            currentPeriodEnd
          );

        if (!addScheduleResult || !addScheduleResult.id)
          throw new BadRequestError("Could not add new subscription");

        return {
          message: "Downgrade scheduled successfully",
          scheduleId: schedule.id,
        };
      }

      case "upgrade": {
        await this.stripeService.updateSubscription(
          subscription.id,
          newPriceId,
          {
            proration_behavior: "create_prorations",
          }
        );
        return { message: "Subscription upgraded successfully" };
      }

      default:
        throw new Error("Unknown subscription action");
    }
  }
}
