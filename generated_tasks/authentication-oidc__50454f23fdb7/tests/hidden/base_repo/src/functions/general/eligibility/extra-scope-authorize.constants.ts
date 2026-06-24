import {
  CREDIT_CARD_DETAILS_SCOPE,
  CREDIT_CARD_FREEZE_SCOPE,
  CREDIT_CARD_UNFREEZE_SCOPE,
  ADDRESS_CHANGE_SCOPE,
  NAME_CHANGE_SCOPE,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  MOBILE_NUMBER_CHANGE_SCOPE,
} from "@libs/config";
import {
  isEligibleForAddressChangeScope,
  isEligibleForCreditCardDetailsScope,
  isEligibleForCreditCardFreezeScope,
  isEligibleForCreditCardUnfreezeScope,
  isEligibleForEmailAddressChangeScope,
  isEligibleForMobileNumberChangeScope,
  notYetImplementedEligibilityCheck,
} from "./extra-scope-authorize.eligibility.js";
import { BankingServiceInterface } from "@services/banking/interface";
import { LMSResult } from "@onmoapp/core-banking";

export const EXTRA_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION: Record<
  string,
  (service: BankingServiceInterface) => Promise<LMSResult<boolean>>
> = {
  [CREDIT_CARD_DETAILS_SCOPE]: isEligibleForCreditCardDetailsScope,
  [CREDIT_CARD_FREEZE_SCOPE]: isEligibleForCreditCardFreezeScope,
  [CREDIT_CARD_UNFREEZE_SCOPE]: isEligibleForCreditCardUnfreezeScope,
  [NAME_CHANGE_SCOPE]: notYetImplementedEligibilityCheck(NAME_CHANGE_SCOPE),
  [EMAIL_ADDRESS_CHANGE_SCOPE]: isEligibleForEmailAddressChangeScope,
  [MOBILE_NUMBER_CHANGE_SCOPE]: isEligibleForMobileNumberChangeScope,
  [ADDRESS_CHANGE_SCOPE]: isEligibleForAddressChangeScope,
};
