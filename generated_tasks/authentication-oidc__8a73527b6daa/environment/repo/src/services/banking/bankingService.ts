import {
  asyncSafeExec,
  CoreBankingFactory,
  coreBankingHandler,
  LMSFailure,
  LMSResult,
  LMSSuccess,
} from "@onmoapp/core-banking";
import { LMSClient } from "@onmoapp/core-banking/lms";

import { MambuClient } from "@onmoapp/core-banking/mambu";

import {
  BankingServiceInterface,
  CreditAccountSummary,
  creditAccountSummarySchema,
  customerSchema,
  CustomerSummary,
  UserIdMap,
  UserIdMapSchema,
} from "./interface";

import { UserRecordsService } from "@services/user/user";
import { ENV } from "@libs/constants";
import { Logger } from "@onmoapp/onmo-logger";
import { getLogger } from "@libs/logger";
import { CardService } from "@services/card/card";
import { CardSummary } from "@services/card/interface";
import { toLMSResult } from "@libs/utils";
import { format, parseISO, subDays } from "date-fns";

export class AuthBankingAdapter implements BankingServiceInterface {
  constructor(
    readonly id: string,
    readonly client: LMSClient,
    readonly cardService: CardService,
    readonly log: Logger,
  ) {}

  // used in eligibility
  getId(): string {
    return this.id;
  }

  async cardSummary(): Promise<LMSResult<CardSummary>> {
    return await this.cardService.cardSummary();
  }

  async creditAccountSummary(): Promise<LMSResult<CreditAccountSummary>> {
    //TODO use Flag implementation
    const account = await this.client.creditAccount.get({ id: this.id });
    if (!account.ok) return account;

    return toLMSResult(
      creditAccountSummarySchema.safeParse({
        id: account.data.id,
        state: "SPENDING_LOCK",
        createdAt: account.data.createdAt,
      }),
    );
  }

  async customerSummary(): Promise<LMSResult<CustomerSummary>> {
    const customer = await this.client.customer.get({ onmoId: this.id });
    if (!customer.ok) return customer;

    const customerSummary: CustomerSummary = {
      id: customer.data.onmoId,
      mobile: customer.data.mobileNumber,
      email: customer.data.email,
      firstName: customer.data.firstName,
      lastName: customer.data.lastName,
      updatedAt: new Date(), //TODO: return createdAt updatedAt from Hal requests
    };

    return LMSSuccess(customerSummary);
  }

  static async init(id: string, log: Logger = getLogger()): Promise<BankingServiceInterface> {
    const client = await CoreBankingFactory.buildHal({ stageName: ENV });
    const cardService = new CardService(id);
    log.info("Hal AuthBankingAdapter build");
    log.addContext({
      codePath: "hal",
    });
    return new AuthBankingAdapter(id, client, cardService, log);
  }
}

export class MambuBankingService implements BankingServiceInterface {
  constructor(
    readonly id: string,
    readonly client: MambuClient,
    readonly cardService: CardService,
    private user: UserIdMap,
    readonly log: Logger,
  ) {}

  getId(): string {
    return this.id;
  }

  async cardSummary(): Promise<LMSResult<CardSummary>> {
    return await this.cardService.cardSummary();
  }

  async creditAccountSummary(): Promise<LMSResult<CreditAccountSummary>> {
    const accountRes = await asyncSafeExec(() =>
      this.client.getCreditAccount(this.user.creditAccountId),
    )();
    if (!accountRes.ok) return accountRes;

    const account = accountRes.data.data;

    return toLMSResult(
      creditAccountSummarySchema.safeParse({
        id: account?.accountDetails.accountId,
        state: account?.accountDetails.state,
        createdAt: account?.accountDetails.approvedDate,
      }),
    );
  }

  async customerSummary(): Promise<LMSResult<CustomerSummary>> {
    const customerResponse = await asyncSafeExec(() =>
      this.client.getCustomerByCustomerId(this.id),
    )();

    if (!customerResponse.ok) return customerResponse;

    const customerUpdated = await this.customerLastUpdated();
    if (!customerUpdated.ok) return customerUpdated;

    const customer = customerSchema.safeParse(customerResponse.data.data);
    if (!customer.success) {
      const fail = LMSFailure({
        type: "VALIDATION_ERROR",
        message: "mambu customer validation failed",
        context: {
          input: customerResponse.data,
          issues: customer.error.issues,
        },
      });

      this.log.error(fail);
      return fail;
    }

    return LMSSuccess({
      ...customer.data,
      updatedAt: customerUpdated.data ?? customer.data.createdAt,
    });
  }

  private async customerLastUpdated(): Promise<LMSResult<Date | undefined>> {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    const activityRes = await asyncSafeExec(() =>
      this.client.getCustomerActivity({
        customerId: this.id,
        fromDate: format(thirtyDaysAgo, "yyyy-MM-dd"),
        toDate: format(today, "yyyy-MM-dd"),
      }),
    )();

    if (!activityRes.ok) return activityRes;

    const activities = activityRes.data.data?.activity ?? [];

    const updatedAt = activities
      .map((item) => {
        if (!item.activity.fieldChanges || item.activity.fieldChanges.length === 0) {
          return null;
        }

        return item.activity.fieldChanges.some((change) => {
          const fieldName = change.fieldChangeName;
          return (
            fieldName === "MOBILE_PHONE" || fieldName === "EMAIL_ADDRESS" || fieldName === "ADDRESS"
          );
        })
          ? parseISO(item.activity.timestamp)
          : null;
      })
      .find((it) => it !== null);

    return LMSSuccess(updatedAt);
  }

  static async init(id: string, log: Logger = getLogger()): Promise<BankingServiceInterface> {
    const banking = await CoreBankingFactory.buildMambu();
    const cardService = new CardService(id);

    //Get lookup table so we can use onmo uuid on the signature

    const userRecordsService = new UserRecordsService();

    const user = await userRecordsService.byId(id);

    if (!user.ok) throw Error(`user lookup not found for id: ${id}`);

    const userIdMap = UserIdMapSchema.parse(user.data);

    log.info("mambu user mapping table loaded");
    log.addContext({
      userMapping: userIdMap,
    });

    return new MambuBankingService(id, banking, cardService, userIdMap, log);
  }
}

export class BankingService {
  static async init(
    id: string,
    log: Logger = getLogger(),
    codePath?: string,
  ): Promise<BankingServiceInterface> {
    return await bankingServiceFactory(id, log, codePath);
  }
}

const bankingServiceFactory = async (id: string, log: Logger = getLogger(), codePath?: string) =>
  await coreBankingHandler(
    { onmoUuid: id },
    {
      hal: () => AuthBankingAdapter.init(id, log),
      mambu: () => MambuBankingService.init(id, log),
    },
    !!codePath,
  );
