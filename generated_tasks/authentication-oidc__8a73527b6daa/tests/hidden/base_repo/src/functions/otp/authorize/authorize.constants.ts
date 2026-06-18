import { APR_SCOPE } from "@libs/constants";
import { isEligibleForAprScope } from "@functions/otp/authorize/authorize.eligibility";

export const OTP_SCOPE_TO_ELIGIBILITY_CHECK_FUNCTION: Record<
  string,
  (onmouuid: string) => Promise<void>
> = {
  [APR_SCOPE]: isEligibleForAprScope,
};
