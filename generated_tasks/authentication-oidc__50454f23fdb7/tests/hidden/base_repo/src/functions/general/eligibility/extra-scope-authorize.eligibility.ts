import {
  ADDRESS_CHANGE_SCOPE,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  MOBILE_NUMBER_CHANGE_SCOPE,
  ENV,
  QA_BYPASS_CUSTOMER_IDS,
} from "@libs/config";
import { isWithinInterval, subDays } from "date-fns";
import { isActionAllowed } from "@onmoapp/onmo-action-validator";
import { AccountStates, Actions } from "@onmoapp/onmo-action-validator/lib/src/types";
import { LMSFailure, LMSResult, LMSSuccess } from "@onmoapp/core-banking";
import { BankingServiceInterface } from "@services/banking/interface";

const DEMO_ONMO_CUSTOMER_ID_PREFIX = "DEMO-";

const shouldBypassThirtyDayRestriction = (customerId: string): boolean => {
  if (customerId.startsWith(DEMO_ONMO_CUSTOMER_ID_PREFIX)) {
    return true;
  }
  return ENV === "staging" && QA_BYPASS_CUSTOMER_IDS.includes(customerId);
};

export const notYetImplementedEligibilityCheck = (scope: string) => {
  return (_service: BankingServiceInterface): Promise<LMSResult<boolean>> => {
    return Promise.resolve(
      LMSFailure({
        type: "UNKNOWN_ERROR",
        message: `${scope} scope eligibility check is not yet implemented`,
      }),
    );
  };
};

export const isEligibleForCreditCardDetailsScope = async (
  service: BankingServiceInterface,
): Promise<LMSResult<boolean>> => {
  const cardStatus = await getCardStatus(service);
  if (!cardStatus.ok) return cardStatus;
  return LMSSuccess(true);
};

export const isEligibleForCreditCardFreezeScope = async (
  service: BankingServiceInterface,
): Promise<LMSResult<boolean>> => {
  const cardStatus = await getCardStatus(service);
  if (!cardStatus.ok) return cardStatus;
  if (cardStatus.data !== "ACTIVE") {
    return LMSSuccess(false);
  }
  return LMSSuccess(true);
};

export const isEligibleForCreditCardUnfreezeScope = async (
  service: BankingServiceInterface,
): Promise<LMSResult<boolean>> => {
  const cardStatus = await getCardStatus(service);
  if (!cardStatus.ok) return cardStatus;
  if (cardStatus.data !== "FREEZE") {
    return LMSSuccess(false);
  }
  return LMSSuccess(true);
};

export const isEligibleForPersonalDetailsChange = async (
  service: BankingServiceInterface,
  scopeType: string,
): Promise<LMSResult<boolean>> => {
  const accountSummary = await service.creditAccountSummary();
  if (!accountSummary.ok) {
    return LMSFailure({
      type: "INTERNAL_SERVER_ERROR",
      message: `Failed ${scopeType} eligibility: Error fetching credit account summary`,
    });
  }

  const accountState = accountSummary.data.state;
  if (!accountState) {
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: `Failed ${scopeType} eligibility: Missing account state on credit account details`,
    });
  }

  const isEmailChangeValidAction = isActionAllowed(
    Actions.CHANGE_EMAIL,
    AccountStates[`${accountState}` as keyof typeof AccountStates],
  );

  const isPhoneChangeValidAction = isActionAllowed(
    Actions.CHANGE_PHONE_NUMBER,
    AccountStates[`${accountState}` as keyof typeof AccountStates],
  );

  if (!isEmailChangeValidAction || !isPhoneChangeValidAction) {
    const reasons = [];
    if (!isEmailChangeValidAction) reasons.push("changing email");
    if (!isPhoneChangeValidAction) reasons.push("changing phone number");

    return LMSSuccess(false);
  }

  const approvedDate = accountSummary.data.createdAt;
  if (!approvedDate) {
    return LMSSuccess(false);
  }

  const customerId = service.getId();

  const daysDifference = Math.floor(
    (new Date().getTime() - new Date(approvedDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDifference < 30 && !shouldBypassThirtyDayRestriction(customerId)) {
    return LMSSuccess(false);
  }

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  const customer = await service.customerSummary();
  if (!customer.ok) {
    return LMSFailure({
      type: "INTERNAL_SERVER_ERROR",
      message: `Failed ${scopeType} eligibility: Error fetching customer summary`,
    });
  }

  const personalDetailChanges = isWithinInterval(customer.data.updatedAt, {
    start: thirtyDaysAgo,
    end: today,
  });

  if (personalDetailChanges && !shouldBypassThirtyDayRestriction(customerId)) {
    return LMSSuccess(false);
  }

  return LMSSuccess(true);
};

export const isEligibleForAddressChangeScope = async (
  service: BankingServiceInterface,
): Promise<LMSResult<boolean>> => {
  return isEligibleForPersonalDetailsChange(service, ADDRESS_CHANGE_SCOPE);
};

export const isEligibleForEmailAddressChangeScope = async (
  service: BankingServiceInterface,
): Promise<LMSResult<boolean>> => {
  return isEligibleForPersonalDetailsChange(service, EMAIL_ADDRESS_CHANGE_SCOPE);
};

export const isEligibleForMobileNumberChangeScope = async (
  service: BankingServiceInterface,
): Promise<LMSResult<boolean>> => {
  return isEligibleForPersonalDetailsChange(service, MOBILE_NUMBER_CHANGE_SCOPE);
};

export const getCardStatus = async (
  service: BankingServiceInterface,
): Promise<LMSResult<string>> => {
  const summary = await service.cardSummary();
  if (!summary.ok) {
    return LMSFailure({ type: "INTERNAL_SERVER_ERROR", message: "Error fetching card summary" });
  }

  const { isActivated, status } = summary.data;

  if (!isActivated) {
    return LMSFailure({
      type: "VALIDATION_ERROR",
      message: "Card is not activated on core banking credit account details",
    });
  }

  return LMSSuccess(status);
};
