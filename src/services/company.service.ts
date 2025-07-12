import { Types } from "mongoose";
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

@Service()
export class CompanyService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly pendingRepository: PendingCompanyRepository,
    private readonly reviewConfigService: ReviewConfigService,
    private readonly apiKeyService: ApiKeyService,
    private readonly subscriptionRepository: SubscriptionRepository
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    //Validate
    await this.ensureCompanyEmailIsUnique(dto.companyMainEmail);
    await this.ensureNoPendingRegistration(dto.companyMainEmail);
    await this.ensureAdminIsUnique(dto.adminEmail);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    //Stripe Setup
    const customer = await this.createStripeCustomer(
      dto.companyMainEmail,
      dto.companyName
    );
    const session = await this.createStripeCheckoutSession(
      customer.id,
      dto.subscriptionPlanId
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
    //validations of id's
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestError("Invalid company or user ID");
    }

    //check if the user exists
    const user = await this.userRepository.findById(userId);
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

    const updatedCompany = await this.companyRepository.update(
      companyId,
      filteredUpdates
    );

    if (!updatedCompany) {
      throw new NotFoundError("Company not found");
    }

    return updatedCompany;
  }

  async updateSubscription(companyId: string, newPriceId: string) {
    const company = await this.getCompanyOrThrow(companyId);
    const activeSubscription = await this.getActiveSubscriptionOrThrow(company);
    const stripeSubscription = await this.getStripeSubscriptionOrThrow(
      activeSubscription
    );

    const currentPriceId =
      this.extractCurrentPriceIdOrThrow(stripeSubscription);
    this.ensureNewPriceIdIsValid(newPriceId);

    const [currentPrice, newPrice] = await this.getPricesOrThrow(
      currentPriceId,
      newPriceId
    );
    const [currentProduct, newProduct] = await this.getProductsOrThrow(
      currentPrice,
      newPrice
    );

    const action = this.getSubscriptionActionOrThrow(
      currentProduct,
      newProduct
    );

    if (action === "same") {
      throw new BadRequestError("Already in the same tier");
    }

    if (action === "downgrade") {
      return await this.handleDowngrade(stripeSubscription, newPriceId);
    }

    if (action === "upgrade") {
      return await this.handleUpgrade(stripeSubscription, newPriceId);
    }

    throw new Error("Unknown subscription action");
  }

  //helpers
  private async getCompanyOrThrow(companyId: string) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) throw new BadRequestError("Company not found");
    return company;
  }

  private async getActiveSubscriptionOrThrow(company: ICompanyDocument) {
    const subscription =
      await this.subscriptionRepository.findActiveSubscriptionByStripeCustomerId(
        company.stripeCustomerId
      );
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

  private extractCurrentPriceIdOrThrow(subscription: any): string {
    const priceId = subscription?.items?.data?.[0]?.price?.id;
    if (!priceId) throw new BadRequestError("Current price ID missing");
    return priceId;
  }

  private ensureNewPriceIdIsValid(newPriceId: string) {
    if (!newPriceId) throw new BadRequestError("New price ID missing");
  }

  private async getPricesOrThrow(currentPriceId: string, newPriceId: string) {
    const [currentPrice, newPrice] = await Promise.all([
      this.stripeService.getPriceById(currentPriceId),
      this.stripeService.getPriceById(newPriceId),
    ]);

    if (!currentPrice) throw new BadRequestError("Current price not found");
    if (!newPrice) throw new BadRequestError("New price not found");

    return [currentPrice, newPrice];
  }

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

    if (!currentProduct.metadata?.tier || !newProduct.metadata?.tier) {
      throw new BadRequestError("Product tier metadata missing");
    }

    return [currentProduct, newProduct];
  }

  private getSubscriptionActionOrThrow(currentPrice: any, newPrice: any) {
    const currentTier = Number(currentPrice.metadata?.tier);
    const newTier = Number(newPrice.metadata?.tier);

    if (isNaN(currentTier) || isNaN(newTier)) {
      throw new Error("Invalid tier metadata on subscription prices");
    }

    return compareTiers(currentTier, newTier);
  }

  private async handleDowngrade(subscription: any, newPriceId: string) {
    const item = subscription.items.data[0];
    if (!item) throw new BadRequestError("Subscription item data missing");

    const { current_period_start, current_period_end } = item;
    if (!current_period_start || !current_period_end) {
      throw new BadRequestError("Subscription period dates missing");
    }

    const schedule = await this.stripeService.createSubscriptionSchedule({
      from_subscription: subscription.id,
    });
    if (!schedule || !schedule.id)
      throw new Error("Failed to create subscription schedule");

    const result = await this.stripeService.addDowngradePhasesToSchedule(
      schedule.id,
      subscription,
      newPriceId,
      current_period_start,
      current_period_end
    );

    if (!result || !result.id)
      throw new BadRequestError("Could not add new subscription");

    return {
      message: "Downgrade scheduled successfully",
      scheduleId: schedule.id,
    };
  }

  private async handleUpgrade(subscription: any, newPriceId: string) {
    if (subscription.schedule) {
      try {
        await this.stripeService.releaseSubscriptionSchedule(
          subscription.schedule as string
        );
        logger.info(
          `Released existing schedule before upgrading subscription ${subscription.id}`
        );
      } catch (error) {
        logger.error(
          `Failed to release existing schedule ${subscription.schedule}:`,
          error
        );
        throw new BadRequestError(
          "Cannot upgrade because existing schedule could not be released"
        );
      }
    }

    await this.stripeService.updateSubscription(subscription.id, newPriceId, {
      proration_behavior: "create_prorations",
    });

    return {
      id: subscription.id,
      message: "Subscription upgraded successfully",
    };
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
      success_url: process.env.STRIPE_SUCCESS_URL!,
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
}
