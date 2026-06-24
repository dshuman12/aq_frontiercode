import {
  ADDRESS_CHANGE_SCOPE,
  CREDIT_CARD_DETAILS_SCOPE,
  CREDIT_CARD_FREEZE_SCOPE,
  CREDIT_CARD_UNFREEZE_SCOPE,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  ENV,
  MOBILE_NUMBER_CHANGE_SCOPE,
} from "@libs/constants";
import { differenceInDays } from "date-fns";
import { isActionAllowed } from "@onmoapp/onmo-action-validator";
import { AccountStates, Actions } from "@onmoapp/onmo-action-validator/lib/src/types";
import { getLogger } from "@libs/logger";
import { BankingServiceInterface } from "@services/banking/interface";
import { LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";

const env = ENV;

// Parse QA bypass customer IDs from environment variable
// Expected format: "id1,id2,id3" or undefined/empty string if no bypasses
const QA_BYPASS_CUSTOMER_IDS: string[] = process.env.QA_BYPASS_CUSTOMER_IDS
  ? process.env.QA_BYPASS_CUSTOMER_IDS.split(",").map((id) => id.trim())
  : [];

const shouldBypassThirtyDayRestriction = (customerId: string): boolean => {
  return env === "staging" && QA_BYPASS_CUSTOMER_IDS.includes(customerId);
};

export const notYetImplementedEligibilityCheck = (scope: string) => {
  return async (): Promise<LMSResult<void>> => {
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `${scope} scope eligibility check is not yet implemented`,
    });
  };
};

export const isEligibleForCreditCardDetailsScope = async (
  bankingService: BankingServiceInterface,
): Promise<LMSResult<void>> => {
  const card = await bankingService.cardSummary();

  if (!card.ok) return card;

  const { isActivated } = card.data;

  if (!isActivated)
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `Failed ${CREDIT_CARD_DETAILS_SCOPE} eligibility: card is not activated`,
    });

  return LMSSuccess();
};

export const isEligibleForCreditCardFreezeScope = async (
  bankingService: BankingServiceInterface,
): Promise<LMSResult<void>> => {
  const card = await bankingService.cardSummary();
  if (!card.ok) return card;

  const { status } = card.data;

  if (status !== "ACTIVE")
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `Failed ${CREDIT_CARD_FREEZE_SCOPE} eligibility: card ${card.data.id} is not activated`,
    });

  return LMSSuccess();
};

export const isEligibleForCreditCardUnfreezeScope = async (
  bankingService: BankingServiceInterface,
): Promise<LMSResult<void>> => {
  const card = await bankingService.cardSummary();
  if (!card.ok) return card;
  const { status } = card.data;

  if (status !== "FREEZE")
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `Failed ${CREDIT_CARD_UNFREEZE_SCOPE} eligibility: Expected FREEZE credit card status but received: ${status}`,
    });

  return LMSSuccess();
};

export const isEligibleForPersonalDetailsChange = async (
  bankingService: BankingServiceInterface,
  scopeType: string,
): Promise<LMSResult<void>> => {
  const logger = getLogger();

  logger.addContext({ scopeType });

  const account = await bankingService.creditAccountSummary();
  if (!account.ok) return account;

  const customer = await bankingService.customerSummary();
  if (!customer.ok) return customer;

  const { updatedAt } = customer.data;
  const { approvedAt, state } = account.data;

  const customerId = bankingService.getId();

  const isEmailChangeValidAction = isActionAllowed(
    Actions.CHANGE_EMAIL,
    //TODO: fix previous type hack
    AccountStates[state as keyof typeof AccountStates],
  );

  const isPhoneChangeValidAction = isActionAllowed(
    Actions.CHANGE_PHONE_NUMBER,
    //TODO: fix previous type hack
    AccountStates[state as keyof typeof AccountStates],
  );

  if (!isEmailChangeValidAction || !isPhoneChangeValidAction) {
    let reasons = [];
    if (!isEmailChangeValidAction) reasons.push("changing email");
    if (!isPhoneChangeValidAction) reasons.push("changing phone number");

    const errMessage = `Action not allowed: ${reasons.join(" and ")}`;
    logger.warn(errMessage);

    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: errMessage,
    });
  }

  if (shouldBypassThirtyDayRestriction(customerId)) {
    logger.info(
      `QA bypass applied for customer ${customerId}: skipping 30-day personal details change restriction`,
    );
    return LMSSuccess();
  }

  const approvedDiff = differenceInDays(new Date(), approvedAt);
  if (approvedDiff < 30) {
    logger.warn("Approved date is within 30 days of today");
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `Approved date is within 30 days of today: ${approvedDiff}`,
    });
  }

  const updatedDiff = differenceInDays(new Date(), updatedAt);
  if (updatedDiff < 30) {
    logger.warn("Personal details have been changed within the last 30 days");
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `Personal details have been changed within the last 30 days`,
    });
  }

  return LMSSuccess();
};

export const isEligibleForAddressChangeScope = async (bankingService: BankingServiceInterface) => {
  return isEligibleForPersonalDetailsChange(bankingService, ADDRESS_CHANGE_SCOPE);
};

export const isEligibleForEmailAddressChangeScope = async (
  bankingService: BankingServiceInterface,
) => {
  return isEligibleForPersonalDetailsChange(bankingService, EMAIL_ADDRESS_CHANGE_SCOPE);
};

export const isEligibleForMobileNumberChangeScope = async (
  bankingService: BankingServiceInterface,
) => {
  return isEligibleForPersonalDetailsChange(bankingService, MOBILE_NUMBER_CHANGE_SCOPE);
};
