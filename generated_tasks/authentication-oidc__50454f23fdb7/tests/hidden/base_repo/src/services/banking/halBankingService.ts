import { CoreBankingFactory, LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";
import { LMSClient } from "@onmoapp/core-banking/lms";

import {
  BankingServiceInterface,
  CardSummary,
  CreditAccountSummary,
  creditAccountSummarySchema,
  CustomerSummary,
} from "./interface";

import { ENV } from "@libs/config";
import { logger } from "@onmoapp/logger";
import { toLMSResult } from "@libs/utils";
import { UserRecordsService } from "@services/user/user";
import { CardService } from "@services/card/cardService";

const HAL_FLAG_TO_STATE: Record<string, string> = {
  "master_status.good_standing": "ACTIVE",
  "master_status.open": "APPROVED",
  "master_status.bad_standing": "ACTIVE_IN_ARREARS",
  "master_status.closed": "CLOSED",
};

const toE164GB = (phone: string): string => {
  const digits = phone.replace(/\s+/g, "");
  if (digits.startsWith("0")) return "+44" + digits.slice(1);
  return digits;
};

export class AuthBankingAdapter implements BankingServiceInterface {
  constructor(
    readonly id: string,
    readonly client: LMSClient,
    private creditAccountId: string | undefined,
  ) {}

  getId(): string {
    return this.id;
  }

  async cardSummary(): Promise<LMSResult<CardSummary>> {
    const creditAccountId = this.creditAccountId as string | undefined;
    if (!creditAccountId) {
      return LMSFailure({
        type: "NOT_FOUND_ERROR",
        message: "No credit account ID found for HAL customer",
      });
    }
    const account = await this.client.creditAccount.get({ id: creditAccountId });
    if (!account.ok) return account;

    const cardId = account.data.metadata?.["cardId"] as string | undefined;
    if (!cardId) {
      return LMSFailure({
        type: "NOT_FOUND_ERROR",
        message: "No card ID found in HAL credit account metadata",
      });
    }

    return CardService.init().getCardDetails(cardId);
  }

  async creditAccountSummary(): Promise<LMSResult<CreditAccountSummary>> {
    const creditAccountId = this.creditAccountId as string | undefined;
    if (!creditAccountId) {
      return LMSFailure({
        type: "NOT_FOUND_ERROR",
        message: "No credit account ID found for HAL customer",
      });
    }
    const account = await this.client.creditAccount.get({ id: creditAccountId });
    if (!account.ok) return account;

    const flags = account.data.flags;
    const isFullLocked = flags.includes("restriction.full_lock");
    const isSpendingLocked = flags.includes("restriction.spending_lock");
    const masterFlag = flags.find((f) => f.startsWith("master_status."));
    const state = isFullLocked
      ? "FULL_LOCK"
      : isSpendingLocked
        ? "SPENDING_LOCK"
        : masterFlag && HAL_FLAG_TO_STATE[masterFlag];

    if (!state) {
      return LMSFailure({
        type: "VALIDATION_ERROR",
        message: `Unable to determine account state from HAL flags: ${flags.join(", ")}`,
      });
    }

    return toLMSResult(
      creditAccountSummarySchema.safeParse({
        id: account.data.id,
        state,
        createdAt: account.data.createdAt,
      }),
      "creditAccountSummary",
    );
  }

  async customerSummary(): Promise<LMSResult<CustomerSummary>> {
    const customer = await this.client.customer.get({ onmoId: this.id });
    if (!customer.ok) return customer;

    const customerSummary: CustomerSummary = {
      id: customer.data.onmoId,
      mobile: toE164GB(customer.data.mobileNumber),
      email: customer.data.email,
      firstName: customer.data.firstName,
      lastName: customer.data.lastName,
      updatedAt: new Date(), //TODO: return createdAt updatedAt from Hal requests
    };

    return LMSSuccess(customerSummary);
  }

  static async init(id: string): Promise<BankingServiceInterface> {
    const client = await CoreBankingFactory.buildHal({ stageName: ENV });
    logger.addContext("codePath", "hal");

    const userRecordsService = new UserRecordsService();
    const user = await userRecordsService.byId(id);
    if (!user.ok) throw user.error;
    const creditAccountId = user.data.creditAccountId as string | undefined;
    if (!creditAccountId) {
      logger.warn("No credit account ID found for HAL customer");
    }

    return new AuthBankingAdapter(id, client, creditAccountId);
  }
}
