// application
import { LogLevel } from "@onmoapp/onmo-logger";

export const FIFTEEN_MINUTES = 15 * 60;
export const FIVE_MINUTES = 5 * 60;
export const SIXTY_SECONDS = 60;
export const COMPLETED_STATUS = "9_completed_status";
export const OTP_SEND_LIMIT = 3;
export const OTP_ATTEMPT_LIMIT = 3;
export const PASSCODE_ATTEMPT_LIMIT = 3;
export const ENV = process.env.ENVIRONMENT as string;
export const LOGGING_LEVEL = (process.env.LOGGING_LEVEL as LogLevel) || "INFO";
// error codes
export const OTP_SEND_LIMIT_REACHED = "OTP_SEND_LIMIT_REACHED";
export const OTP_EXPIRED_SEND_LIMIT_REACHED = "OTP_EXPIRED_SEND_LIMIT_REACHED";
export const OTP_EXPIRED_RESEND = "OTP_EXPIRED_RESEND";
export const OTP_INVALID_ATTEMPT_LIMIT_REACHED = "OTP_INVALID_ATTEMPT_LIMIT_REACHED";
export const OTP_INVALID_REATTEMPT = "OTP_INVALID_REATTEMPT";
export const PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED = "PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED";
export const PASSCODE_INVALID_REATTEMPT = "PASSCODE_INVALID_REATTEMPT";
export const REFRESH_TOKEN_EXPIRED = "REFRESH_TOKEN_EXPIRED";

// passcode hashing
export const INTERATIONS = 100_000;
export const KEY_LENGTH = 64;
export const DIGEST = "sha512";

// auth flows
export const OTP_AUTH_FLOW = "otp";
export const OTP_PASSCODE_AUTH_FLOW = "otp_passcode";
export const EXTRA_SCOPE_AUTH_FLOW = "extra_scope";
export const FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW = "forgotten_passcode_logged_in";
export const FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW = "forgotten_passcode_logged_out";
export const BIOMETRICS_REGISTRATION_AUTH_FLOW = "biometrics_registration";
export const BIOMETRICS_AUTH_FLOW = "biometrics";

// extra-scope flows
export const EXTRA_SCOPE_OTP_PASSCODE_FLOW = "otp_passcode";
export const EXTRA_SCOPE_PASSCODE_FLOW = "passcode";
export const EXTRA_SCOPE_BIOMETRICS_FLOW = "biometrics";
export const EMAIL_CHANGE_FLOW = "email_change";
export const PHONE_NUMBER_CHANGE_FLOW = "phone_number_change";

// login flows
export const FIRST_TIME_LOGIN_FLOW = "first_time_login";
export const RELOGIN_FLOW = "relogin";

// supported account states
export const SUPPORTED_CREDIT_ACCOUNT_STATES: string[] = [
  "ACTIVE",
  "APPROVED",
  "ACTIVE_IN_ARREARS",
  "CLOSED",
  "CLOSED_WRITTEN_OFF",
  "FULL_LOCK",
  "SPENDING_LOCK",
];

// adapter names
export const CORE_BANKING_ADAPTER_CLIENT_NAME = "MAMBU_CLIENT";
export const CORE_PAYMENTS_ADAPTER_CLIENT_NAME = "PAYMENTOLOGY_CLIENT";

// token domains
export const APP_TOKEN_DOMAIN = "app";
export const WEB_TOKEN_DOMAIN = "web";

// scopes
export const APR_SCOPE = process.env.APR_SCOPE as string;
export const CUSTOMER_CARE_SCOPE = process.env.CUSTOMER_CARE_SCOPE as string;
export const LOAN_ACCOUNT_ID_SCOPE = process.env.LOAN_ACCOUNT_ID_SCOPE as string; // TODO: deprecate when not in use & replaced with credit-card-account-id
export const CREDIT_CARD_ACCOUNT_ID_SCOPE = process.env.CREDIT_CARD_ACCOUNT_ID_SCOPE as string;
export const CREDIT_CARD_ID_SCOPE = process.env.CREDIT_CARD_ID_SCOPE as string;
export const REPAYMENT_SCOPE = process.env.REPAYMENT_SCOPE as string;
export const CUSTOMER_PROFILE_SCOPE = process.env.CUSTOMER_PROFILE_SCOPE as string;
export const SUPPORT_SERVICES_SCOPE = process.env.SUPPORT_SERVICES_SCOPE as string;
export const AUTH_SERVICES_SCOPE = process.env.AUTH_SERVICES_SCOPE as string;
export const CREDIT_CARD_ACCOUNT_SCOPE = process.env.CREDIT_CARD_ACCOUNT_SCOPE as string;
export const DIRECT_DEBIT_SCOPE = process.env.DIRECT_DEBIT_SCOPE as string;
export const DEBIT_CARD_ACCOUNT_SCOPE = process.env.DEBIT_CARD_ACCOUNT_SCOPE as string;
export const FIRST_TIME_LOGIN_SCOPE = process.env.FIRST_TIME_LOGIN_SCOPE as string;

// extra scopes
export const CREDIT_CARD_DETAILS_SCOPE = process.env.CREDIT_CARD_DETAILS_SCOPE as string;
export const CREDIT_CARD_ACTIVATION_SCOPE = process.env.CREDIT_CARD_ACTIVATION_SCOPE as string;
export const CREDIT_CARD_FREEZE_SCOPE = process.env.CREDIT_CARD_FREEZE_SCOPE as string;
export const CREDIT_CARD_UNFREEZE_SCOPE = process.env.CREDIT_CARD_UNFREEZE_SCOPE as string;
export const NAME_CHANGE_SCOPE = process.env.NAME_CHANGE_SCOPE as string;
export const EMAIL_ADDRESS_CHANGE_SCOPE = process.env.EMAIL_ADDRESS_CHANGE_SCOPE as string;
export const MOBILE_NUMBER_CHANGE_SCOPE = process.env.MOBILE_NUMBER_CHANGE_SCOPE as string;
export const ADDRESS_CHANGE_SCOPE = process.env.ADDRESS_CHANGE_SCOPE as string;
export const BIOMETRICS_CHANGE_SCOPE = process.env.BIOMETRICS_CHANGE_SCOPE as string;
export const PASSCODE_CHANGE_SCOPE = process.env.PASSCODE_CHANGE_SCOPE as string;
// api test extra-scope scopes:
export const TEST_OTP_STEP_EXTRA_SCOPE = process.env.TEST_OTP_STEP_EXTRA_SCOPE as string;
export const TEST_BIOMETRICS_STEP_EXTRA_SCOPE = process.env
  .TEST_BIOMETRICS_STEP_EXTRA_SCOPE as string;

// tables
export const USER_TABLE = process.env.USER_TABLE as string;
export const AUTH_TRANSACTIONS_TABLE = process.env.AUTH_TRANSACTIONS_TABLE as string;
export const AUTH_KEYS_TABLE = process.env.AUTH_KEYS_TABLE as string;
export const CUSTOMER_TO_CARD_MAPPING_TABLE = process.env.CUSTOMER_TO_CARD_MAPPING_TABLE as string;

// params
export const NON_CONFLICT_SCOPES_PARAM = process.env.NON_CONFLICTING_SCOPES_PARAM as string;
export const EXCLUSIVE_SCOPES_PARAM = process.env.EXCLUSIVE_SCOPES_PARAM as string;
export const AUTH_FLOW_SCOPES_PARAM = process.env.AUTH_FLOW_SCOPES_PARAM as string;
