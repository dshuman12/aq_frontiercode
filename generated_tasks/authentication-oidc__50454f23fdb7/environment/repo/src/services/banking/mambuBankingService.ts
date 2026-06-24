import {
  asyncSafeExec,
  CoreBankingFactory,
  LMSFailure,
  LMSResult,
  LMSSuccess,
} from "@onmoapp/core-banking";
import { MambuClient } from "@onmoapp/core-banking/mambu";

import {
  BankingServiceInterface,
  CardSummary,
  CreditAccountSummary,
  creditAccountSummarySchema,
  customerSchema,
  CustomerSummary,
  UserIdMap,
  UserIdMapSchema,
} from "./interface";
import { CardService } from "@services/card/cardService";
import { UserRecordsService } from "@services/user/user";
import { logger } from "@onmoapp/logger";
import { toLMSResult } from "@libs/utils";
import { format, parseISO, subDays } from "date-fns";
import { AccountGenericData } from "@onmoapp/onmo-types";

export class MambuBankingService implements BankingServiceInterface {
  constructor(
    readonly id: string,
    readonly client: MambuClient,
    private user: UserIdMap,
  ) {}

  getId(): string {
    return this.id;
  }

  async cardSummary(): Promise<LMSResult<CardSummary>> {
    const accountRes = await this.getCreditAccount();
    if (!accountRes.ok) return accountRes;

    const card = accountRes.data.cards?.[0];
    if (!card?.cardId)
      return LMSFailure({ type: "NOT_FOUND_ERROR", message: "no card found on credit account" });

    return CardService.init().getCardDetails(card.cardId);
  }

  private async getCreditAccount(): Promise<LMSResult<AccountGenericData>> {
    if (this.user.creditAccountId === undefined)
      return LMSFailure({
        type: "VALIDATION_ERROR",
        message: "creditAccountId is required for Mambu creditAccountSummary ",
      });

    const accountRes = await asyncSafeExec(() =>
      this.client.getCreditAccount(this.user.creditAccountId!),
    )();
    if (!accountRes.ok) return accountRes;
    if (accountRes.data.error !== null) {
      logger.addContext("cause", accountRes.data.error);
      logger.error("get credit account failed");
      return LMSFailure({
        type: "VALIDATION_ERROR",
        message: accountRes.data.error.errorMessage ?? "get credit account failed",
      });
    }

    if (!accountRes.data.data)
      return LMSFailure({ type: "VALIDATION_ERROR", message: "missing credit account data" });

    return LMSSuccess(accountRes.data.data);
  }

  async creditAccountSummary(): Promise<LMSResult<CreditAccountSummary>> {
    const accountRes = await this.getCreditAccount();
    if (!accountRes.ok) return accountRes;

    const account = accountRes.data;

    return toLMSResult(
      creditAccountSummarySchema.safeParse({
        id: account.accountDetails.accountId,
        state: account.accountDetails.state,
        createdAt: account.accountDetails.approvedDate,
      }),
      "creditAccountSummary",
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
      logger.addContext("customerResult", customer.error);
      logger.error("mambu customer validation failed");
      return LMSFailure({
        type: "VALIDATION_ERROR",
        message: "mambu customer validation failed",
        context: {
          input: customerResponse.data,
          issues: customer.error.issues,
        },
      });
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

  static async init(id: string): Promise<BankingServiceInterface> {
    const banking = await CoreBankingFactory.buildMambu();

    const userRecordsService = new UserRecordsService();

    const user = await userRecordsService.byId(id);

    if (!user.ok) throw Error(`user lookup not found for id: ${id}`);

    const userIdMap = UserIdMapSchema.parse(user.data);

    return new MambuBankingService(id, banking, userIdMap);
  }
}
