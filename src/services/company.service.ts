import mongoose, { Types } from "mongoose";
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
import { compareTiers } from "../utils/plan";
import { RegisterCompanyDto } from "../dto/company/register.company.dto";
import { PendingCompanyRepository } from "../repositories/pending.repository";
import { logger } from "../utils/logger";
import { ReviewConfigService } from "./review.config.service";
import { ApiKeyService } from "./key.service";
import { SubscriptionRepository } from "../repositories/subscription.repository";
import { mapRegisterDtoToPendingCompany } from "../mappers/company.mapper";
import { IPendingCompanyDocument } from "../models/entities/pending.company.entity";
import { ICompanyData } from "../models/types/company.type";
import { IUserData } from "../models/types/user.type";
import {
  CompanyModel,
  ICompanyDocument,
} from "../models/entities/company.entity";
import { ISubscriptionDocument } from "../models/entities/subscription.entity";
import { PlanRepository } from "../repositories/plan.repository";
import { IPlanDocument } from "../models/entities/plan.entity";
import { BillingOption } from "../models/types/plan.type";
import { ISubscriptionData } from "../models/types/subscription.type";

@Service()
export class CompanyService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly pendingRepository: PendingCompanyRepository,
    private readonly reviewConfigService: ReviewConfigService,
    private readonly apiKeyService: ApiKeyService,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PlanRepository
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    //Validate
    await this.ensureCompanyEmailIsUnique(dto.companyMainEmail);
    await this.ensureNoPendingRegistration(dto.companyMainEmail);
    await this.ensureAdminIsUnique(dto.adminEmail);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    //if trial, create user, company and assign default config
    if (dto.isTrial) {
      console.warn("first");
      return await this.activateTrialAccount({
        type: "trial",
        dto: { ...dto, password: hashedPassword },
      });
    }

    await this.ensurePlanExists(dto.priceId);

    //Stripe Setup
    const customer = await this.createStripeCustomer(
      dto.companyMainEmail,
      dto.companyName
    );

    const session = await this.createStripeCheckoutSession(
      customer.id,
      dto.priceId
    );

    //Prepare Pending Company
    const pending = mapRegisterDtoToPendingCompany({
      ...dto,
      password: hashedPassword,
      stripeCustomerId: customer.id,
      stripeSessionId: session.id,
      stripePaymentLink: session.url!,
      stripeSessionExpiresAtTimestamp: session.expires_at,
    });

    //Save or rollback
    try {
      await this.pendingRepository.create(pending);
    } catch (err) {
      await this.stripeService.deleteCustomer(customer.id);
      throw err;
    }

    return { checkoutUrl: session.url };
  }

  async releaseScheduledSubscriptionBySubscription(
    scubscription: ISubscriptionDocument
  ) {
    if (!scubscription.scheduledUpdate) return;

    const releasedSchedule =
      await this.stripeService.releaseSubscriptionSchedule(
        scubscription.scheduledUpdate.scheduleId
      );

    if (!releasedSchedule || releasedSchedule.status !== "released") {
      throw new BadRequestError("Failed to release subscription schedule");
    }
  }

  async releaseScheduledSubscriptionByCompanyId(companyId: string) {
    const companySubscription = await this.subscriptionRepository.findOne({
      companyId: companyId,
    });

    if (!companySubscription) throw new BadRequestError("Company not found");
    if (!companySubscription.scheduledUpdate)
      throw new BadRequestError("No scheduled subscriptions found");

    return await this.stripeService.releaseSubscriptionSchedule(
      companySubscription.scheduledUpdate.scheduleId
    );
  }

  async convertTrialToPaid(
    trialSubscription: ISubscriptionDocument,
    stripeSubscriptionId: string
  ): Promise<void> {
    const stripeSubscription = await this.stripeService.getSubscription(
      stripeSubscriptionId
    );
    const item = stripeSubscription.items.data[0];
    const price = item.price;
    const product = await this.stripeService.getProductById(
      price.product as string
    );

    trialSubscription.stripeSubscriptionId = stripeSubscriptionId;
    trialSubscription.stripeCustomerId = stripeSubscription.customer as string;

    trialSubscription.isTrial = false;
    trialSubscription.trialConvertedAt = new Date();

    trialSubscription.status = stripeSubscription.status;
    trialSubscription.currentPeriodStart = new Date(
      stripeSubscription.items.data[0].current_period_start * 1000
    );
    trialSubscription.currentPeriodEnd = new Date(
      stripeSubscription.items.data[0].current_period_end * 1000
    );
    trialSubscription.cancelAt = stripeSubscription.cancel_at
      ? new Date(stripeSubscription.cancel_at * 1000)
      : undefined;
    trialSubscription.canceledAt = stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : undefined;
    trialSubscription.cancelAtPeriodEnd =
      stripeSubscription.cancel_at_period_end;

    // Update plan-related info
    trialSubscription.priceId = price.id;
    trialSubscription.productId = product.id;
    trialSubscription.productName = product.name;
    trialSubscription.amount = price.unit_amount ?? 0;
    trialSubscription.currency = price.currency;
    trialSubscription.interval = price.recurring?.interval as "month" | "year";

    trialSubscription.allowedUsers = parseInt(
      product.metadata.allowedUsers ?? "0"
    );
    trialSubscription.allowedTranscripts = parseInt(
      product.metadata.allowedTranscripts ?? "0"
    );
    trialSubscription.allowedReviews = parseInt(
      product.metadata.allowedReviews ?? "0"
    );
    trialSubscription.tier = parseInt(price.metadata.tier ?? "0");

    await trialSubscription.save();

    logger.info(
      `Converted trial to paid for companyId=${trialSubscription.companyId}`
    );
  }

  async activateCompany(
    pendingCompanyId: string,
    subscriptionId: string
  ): Promise<{ company: ICompanyData; adminUser: IUserData }> {
    const pending: IPendingCompanyDocument | null =
      await this.pendingRepository.findById(pendingCompanyId);
    if (!pending) {
      throw new BadRequestError("Pending company not found");
    }

    try {
      const subscription = await this.stripeService.getSubscription(
        subscriptionId
      );
      const productId = subscription.items.data[0]?.price?.product;
      if (!productId) {
        throw new BadRequestError("Invalid subscription product");
      }

      const productRef = subscription.items.data[0]?.price?.product;

      if (typeof productRef !== "string") {
        throw new BadRequestError(
          "Subscription product ID is invalid or expanded object"
        );
      }

      const product = await this.stripeService.getProductById(productRef);

      const company: ICompanyDocument = await this.createCompanyFromPending(
        pending
      );

      const adminUser: IUserData = await this.createAdminUserFromPending(
        pending,
        company.id
      );

      await this.reviewConfigService.assignDefaultReviewConfigToCompany(
        company._id
      );

      if (product.metadata?.tier === "3") {
        logger.info(`Generating API key for companyId=${company._id}`);
        await this.apiKeyService.regenerateApiKey(company._id.toString());
      }

      await this.pendingRepository.delete(pendingCompanyId);

      logger.info(
        `Activated company ${company.name} with admin ${adminUser.email}`
      );

      return { company, adminUser };
    } catch (error: any) {
      logger.error(
        `Failed to activate companyId=${pendingCompanyId}: ${error.message}`,
        error.stack
      );
      await this.rollbackActivation(pending);

      if (error instanceof BadRequestError) {
        throw error;
      }

      throw new Error(`Activation failed: ${error.message}`);
    }
  }

  private async rollbackActivation(pending: any) {
    try {
      // Delete any partially created company
      if (pending.stripeCustomerId) {
        const company = await this.companyRepository.findByStripeCustomerId(
          pending.stripeCustomerId
        );
        if (company) await this.companyRepository.delete(company.id);
      }

      // Delete any partially created user
      const user = await this.userRepository.findByEmail(pending.adminEmail);
      if (user) await this.userRepository.delete(user.id);
    } catch (rollbackError) {
      logger.error("Rollback failed:", rollbackError);
    }
  }

  async cancelScheduledSubscriptionBySubscription(
    scubscription: ISubscriptionDocument
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
    const companySubscription = await this.subscriptionRepository.findOne({
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
    const companySubscription = await this.subscriptionRepository.findOne({
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

    // Use release instead of cancel for scheduled subscriptions
    if (companySubscription.scheduledUpdate) {
      await this.releaseScheduledSubscriptionBySubscription(
        companySubscription
      );
    }

    return result;
  }

  async getCompanyById(companyId: string) {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestError("Invalid company ID");
    }

    const company = await this.companyRepository.findById(companyId);

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
    //check if the fields are valid
    const allowedFields = ["mainEmail", "phone", "address"];
    const filteredUpdates: Partial<any> = {};
    for (const key of allowedFields) {
      if (updates[key]) {
        filteredUpdates[key] = updates[key];
      }
    }

    const updatedCompany = await this.companyRepository.update(
      companyId,
      filteredUpdates
    );

    if (!updatedCompany) {
      throw new BadRequestError("Error updating company");
    }

    return updatedCompany;
  }

  async updateSubscription(companyId: string, newPriceId: string) {
    const company = await this.getCompanyOrThrow(companyId);
    const activeSubscription = await this.getActiveSubscriptionOrThrow(company);

    this.extractCurrentPriceIdOrThrow(activeSubscription);
    this.ensureNewPriceIdIsValid(newPriceId);

    const currentPrice = await this.findBillingOptionByPriceIdOrThrow(
      activeSubscription.priceId
    );

    const newPrice = await this.findBillingOptionByPriceIdOrThrow(newPriceId);

    const action = this.getSubscriptionActionOrThrow(
      currentPrice.billingOption,
      newPrice.billingOption
    );

    if (action === "same") {
      throw new BadRequestError("Already in the same tier");
    }

    if (action === "downgrade") {
      await this.validateDowngrade(company._id, newPriceId);
      return await this.handleDowngrade(activeSubscription, newPriceId);
    }

    if (action === "upgrade") {
      return await this.handleUpgrade(activeSubscription, newPriceId);
    }

    throw new Error("Unknown subscription action");
  }

  //helpers
  private async getCompanyOrThrow(companyId: string) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new BadRequestError("Company not found");
    return company;
  }

  private async findBillingOptionByPriceIdOrThrow(id: string) {
    const result = await this.planRepository.findBillingOptionByPriceId(id);

    if (!result || !result.billingOption) {
      throw new NotFoundError(`Price with id ${id} not found`);
    }

    return result;
  }

  private async getActiveSubscriptionOrThrow(company: ICompanyDocument) {
    const subscription = await this.subscriptionRepository.findOne({
      companyId: company,
      status: "active",
    });
    if (!subscription)
      throw new BadRequestError("Company has no active subscription");
    return subscription;
  }

  private async getStripeSubscriptionOrThrow(
    subscription: ISubscriptionDocument
  ) {
    const stripeSub = await this.stripeService.getSubscription(
      subscription.stripeSubscriptionId
    );
    if (!stripeSub) throw new BadRequestError("No active subscription found");
    return stripeSub;
  }

  private extractCurrentPriceIdOrThrow(
    subscription: ISubscriptionDocument
  ): string {
    const priceId = subscription?.priceId;
    if (!priceId) throw new BadRequestError("Current price ID missing");
    return priceId;
  }

  private ensureNewPriceIdIsValid(newPriceId: string) {
    if (!newPriceId) throw new BadRequestError("New price ID missing");
  }

  // private async getPricesOrThrow(currentPriceId: string, newPriceId: string) {
  //   const [currentPrice, newPrice] = await Promise.all([
  //     this.stripeService.getPriceById(currentPriceId),
  //     this.stripeService.getPriceById(newPriceId),
  //   ]);

  //   if (!currentPrice) throw new BadRequestError("Current price not found");
  //   if (!newPrice) throw new BadRequestError("New price not found");

  //   return [currentPrice, newPrice];
  // }

  private async getProductsOrThrow(currentPrice: any, newPrice: any) {
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

    return [currentProduct, newProduct];
  }

  private getSubscriptionActionOrThrow(
    activePrice: BillingOption,
    newPrice: BillingOption
  ) {
    if (isNaN(activePrice.tier) || isNaN(newPrice.tier)) {
      throw new BadRequestError("Invalid tier metadata on subscription prices");
    }

    return compareTiers(activePrice.tier, newPrice.tier);
  }

  private async handleDowngrade(
    subscription: ISubscriptionDocument,
    newPriceId: string
  ) {
    if (!subscription) throw new BadRequestError("Subscription data missing");

    const { currentPeriodStart, currentPeriodEnd } = subscription;
    if (!currentPeriodStart || !currentPeriodEnd) {
      throw new BadRequestError("Subscription period dates missing");
    }

    const schedule = await this.stripeService.createSubscriptionSchedule({
      from_subscription: subscription.stripeSubscriptionId,
    });

    if (!schedule || !schedule.id)
      throw new Error("Failed to create subscription schedule");

    const result = await this.stripeService.addDowngradePhasesToSchedule(
      schedule.id,
      subscription,
      newPriceId,
      currentPeriodStart,
      currentPeriodEnd
    );

    if (!result || !result.id)
      throw new BadRequestError("Could not add new subscription");

    return {
      message: "Downgrade scheduled successfully",
      scheduleId: schedule.id,
    };
  }

  private async handleUpgrade(
    subscription: ISubscriptionDocument,
    newPriceId: string
  ) {
    if (subscription.scheduledUpdate) {
      try {
        await this.stripeService.releaseSubscriptionSchedule(
          subscription.scheduledUpdate.scheduleId
        );
        logger.info(
          `Released existing schedule before upgrading subscription ${subscription.id}`
        );
      } catch (error) {
        logger.error(
          `Failed to release existing schedule ${subscription.scheduledUpdate.scheduleId}:`,
          error
        );
        throw new BadRequestError(
          "Cannot upgrade because existing schedule could not be released"
        );
      }
    }

    //check if current is trial
    if (subscription.isTrial) {
      const session = await this.createStripeCheckoutSession(
        subscription.stripeCustomerId,
        newPriceId
      );

      return { checkoutUrl: session.url };
    } else {
      await this.stripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        newPriceId,
        {
          proration_behavior: "create_prorations",
        }
      );
    }

    return {
      id: subscription.id,
      message: "Subscription upgraded successfully",
    };
  }

  private async validateDowngrade(
    companyId: string | Types.ObjectId,
    newPriceId: string
  ): Promise<void> {
    // Get new price details with associated plan
    const newPriceResult = await this.findBillingOptionByPriceIdOrThrow(
      newPriceId
    );

    // Debugging log
    console.log("Validation Data:", {
      priceId: newPriceId,
      billingOption: newPriceResult.billingOption,
      plan: newPriceResult.plan,
    });

    // Count active users
    const activeUsers = await this.userRepository.countActiveUsersByCompany(
      companyId
    );

    // Check if downgrade violates user limit
    if (activeUsers > newPriceResult.plan.allowedUsers) {
      throw new BadRequestError(
        `Cannot downgrade: ${activeUsers} active users exceed new plan limit of ${newPriceResult.plan.allowedUsers}`
      );
    }
  }

  private async ensureCompanyEmailIsUnique(email: string) {
    const existing = await this.companyRepository.findOne({ mainEmail: email });
    if (existing)
      throw new BadRequestError("Company with this email already exists");
  }

  private async ensureNoPendingRegistration(email: string) {
    const pending = await this.pendingRepository.findOne({
      companyMainEmail: email,
    });
    if (pending)
      throw new BadRequestError("Company registration is already pending.");
  }

  private async ensurePlanExists(priceId: string) {
    const plan = await this.planRepository.findPlanByPriceId(priceId);
    if (!plan)
      throw new NotFoundError(`Price with id ${priceId} was not found`);
  }

  private async ensureAdminIsUnique(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (user)
      throw new BadRequestError("User with this email is already registered");
  }

  private async createStripeCustomer(email: string, name: string) {
    const customer = await this.stripeService.createCustomer(email, name);
    if (!customer?.id)
      throw new BadRequestError("Failed to create Stripe customer");
    return customer;
  }

  private async createStripeCheckoutSession(
    customerId: string,
    planId: string
  ) {
    const session = await this.stripeService.createCheckoutSession({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: planId, quantity: 1 }],
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      success_url:
        process.env.NODE_ENV === "development"
          ? "https://www.google.com"
          : "https://www.google.com",
      cancel_url: process.env.STRIPE_CANCEL_URL!,
    });

    if (!session?.url)
      throw new BadRequestError("Failed to create Stripe Checkout session");
    return session;
  }

  private async createCompanyFromPending(
    pending: IPendingCompanyDocument
  ): Promise<ICompanyDocument> {
    return this.companyRepository.create({
      name: pending.companyName,
      mainEmail: pending.companyMainEmail,
      phone: pending.companyPhone,
      address: pending.address,
      stripeCustomerId: pending.stripeCustomerId,
      isActive: true,
    });
  }

  private async createAdminUserFromPending(
    pending: IPendingCompanyDocument,
    companyId: string
  ): Promise<IUserData> {
    return this.userRepository.create({
      name: pending.adminName,
      email: pending.adminEmail,
      password: pending.password,
      role: "company_admin",
      companyId,
      isActive: true,
    });
  }

  async activateTrialAccount(input: {
    type: "trial";
    dto: RegisterCompanyDto & { password: string };
  }): Promise<{
    company: ICompanyDocument;
    adminUser: IUserData;
    subscription: ISubscriptionData;
  }> {
    if (input.type !== "trial") {
      throw new Error("This method only supports trial activation");
    }
    const dto = input.dto;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const stripeCustomer = await this.stripeService.createCustomer(
        dto.companyMainEmail,
        dto.companyName
      );

      const company: ICompanyDocument = await this.companyRepository.create(
        {
          name: dto.companyName,
          mainEmail: dto.companyMainEmail,
          phone: dto.companyPhone,
          address: dto.address,
          isActive: true,
          stripeCustomerId: stripeCustomer.id,
        },
        session
      );

      const adminUser: IUserData = await this.userRepository.create(
        {
          name: dto.adminName,
          email: dto.adminEmail,
          password: dto.password,
          role: "company_admin",
          companyId: company._id,
          isActive: true,
        },
        session
      );

      const now = new Date();
      const trialDurationDays = 14;

      const trialSubscription = await this.subscriptionRepository.create(
        {
          companyId: company._id,
          stripeSubscriptionId: ``,
          stripeCustomerId: stripeCustomer.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: new Date(
            now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000
          ),
          cancelAtPeriodEnd: false,

          priceId: "trial",
          productId: "trial",
          productName: "Trial Plan",
          amount: 0,
          currency: "eur",
          interval: "month",

          allowedUsers: 3,
          allowedTranscripts: 500,
          allowedReviews: 250,
          tier: 0,

          isTrial: true,
          trialStart: now,
          trialEndsAt: new Date(
            now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000
          ),
        },
        session
      );

      await this.reviewConfigService.assignDefaultReviewConfigToCompany(
        company._id
      );

      await session.commitTransaction();
      session.endSession();

      return {
        adminUser: adminUser,
        company: company,
        subscription: trialSubscription,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
