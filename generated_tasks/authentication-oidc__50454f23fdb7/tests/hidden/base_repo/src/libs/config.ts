import { apiResponse } from "@onmoapp/handler-middleware";
import common from "../../config/common.yaml";
import staging from "../../config/staging.yaml";
import prod from "../../config/prod.yaml";
import app from "../../config/app.yaml";

export const ENV = process.env.ENVIRONMENT as string;
const envConfig = ENV === "prod" ? prod : staging;

// ── Derivation helper (mirrors Terraform's `for` expressions) ───────────────

const deriveMap = <T extends Record<string, string>>(map: T, fn: (v: string) => string) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, fn(v)])) as T;

// ── Derived maps ────────────────────────────────────────────────────────────

export const tables = deriveMap(common.tables, (v) => `${v}-${ENV}`);
export const params = deriveMap(common.params, (v) => `/onmo/auth/${ENV}/${v}`);
export const secrets = deriveMap(common.secrets, (v) => `${v}-${ENV}`);

// ── Scopes (common + env-specific test scopes) ─────────────────────────────

export const scopes: Record<string, string> = { ...common.scopes, ...envConfig.test_scopes };

// ── Non-standard params (full paths in env JSON, not derived) ───────────────

export const nonStandardParams = envConfig.params;

// ── URLs ────────────────────────────────────────────────────────────────────

export const urls = envConfig.urls;

// ── Gateways (common + env-specific) ────────────────────────────────────────

export const gateways = { ...common.gateways, ...envConfig.gateways };

// ── SFMC (common + env-specific) ────────────────────────────────────────────

export const sfmc = { ...common.sfmc, ...envConfig.sfmc };

// ── PostHog (common flags + derived secret) ─────────────────────────────────

export const posthog = {
  ...common.posthog,
  POSTHOG_SECRET_NAME: secrets.POSTHOG_SECRET_NAME,
  POSTHOG_SECRET_ARN: secrets.POSTHOG_SECRET_ARN,
};

// ── Card service config ─────────────────────────────────────────────────────

export const card = {
  CARD_SERVICE_SECRET_NAME: secrets.CARD_SERVICE_SECRET_NAME,
  CARD_SERVICE_BASE_URL: envConfig.urls.CARD_SERVICE_BASE_URL,
};

// ── Misc config ─────────────────────────────────────────────────────────────

export const QA_BYPASS_CUSTOMER_IDS: string[] = envConfig.misc.QA_BYPASS_CUSTOMER_IDS
  ? envConfig.misc.QA_BYPASS_CUSTOMER_IDS.split(",").map((id: string) => id.trim())
  : [];

// ── Environment ─────────────────────────────────────────────────────────────

export const REGION = common.service.REGION;
export const SERVICE_NAME = common.service.SERVICE_NAME;
export const BASE_PATH = common.service.BASE_PATH;
export const service = common.service;

// ── Process env (secrets & runtime values not in YAML) ──────────────────────

export const PINPOINT_PROJECT_ID = process.env.PINPOINT_PROJECT_ID as string;
export const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID as string;
export const API_VERSION = process.env.API_VERSION as string;

// ── Named exports (config-derived) ──────────────────────────────────────────

export const CARD_SERVICE_SECRET_NAME = card.CARD_SERVICE_SECRET_NAME;
export const CARD_SERVICE_BASE_URL = card.CARD_SERVICE_BASE_URL;

export const APR_SCOPE = scopes.APR_SCOPE;
export const CLM_SCOPE = scopes.CLM_SCOPE;
export const BIOMETRICS_CHECK_SCOPE = scopes.BIOMETRICS_CHECK_SCOPE;
export const CUSTOMER_CARE_SCOPE = scopes.CUSTOMER_CARE_SCOPE;
export const LOAN_ACCOUNT_ID_SCOPE = scopes.LOAN_ACCOUNT_ID_SCOPE;
export const CREDIT_CARD_ACCOUNT_ID_SCOPE = scopes.CREDIT_CARD_ACCOUNT_ID_SCOPE;
export const CREDIT_CARD_ID_SCOPE = scopes.CREDIT_CARD_ID_SCOPE;
export const REPAYMENT_SCOPE = scopes.REPAYMENT_SCOPE;
export const CUSTOMER_PROFILE_SCOPE = scopes.CUSTOMER_PROFILE_SCOPE;
export const SUPPORT_SERVICES_SCOPE = scopes.SUPPORT_SERVICES_SCOPE;
export const AUTH_SERVICES_SCOPE = scopes.AUTH_SERVICES_SCOPE;
export const CREDIT_CARD_ACCOUNT_SCOPE = scopes.CREDIT_CARD_ACCOUNT_SCOPE;
export const DIRECT_DEBIT_SCOPE = scopes.DIRECT_DEBIT_SCOPE;
export const DEBIT_CARD_ACCOUNT_SCOPE = scopes.DEBIT_CARD_ACCOUNT_SCOPE;
export const FIRST_TIME_LOGIN_SCOPE = scopes.FIRST_TIME_LOGIN_SCOPE;
export const CREDIT_CARD_DETAILS_SCOPE = scopes.CREDIT_CARD_DETAILS_SCOPE;
export const CREDIT_CARD_ACTIVATION_SCOPE = scopes.CREDIT_CARD_ACTIVATION_SCOPE;
export const CREDIT_CARD_FREEZE_SCOPE = scopes.CREDIT_CARD_FREEZE_SCOPE;
export const CREDIT_CARD_UNFREEZE_SCOPE = scopes.CREDIT_CARD_UNFREEZE_SCOPE;
export const NAME_CHANGE_SCOPE = scopes.NAME_CHANGE_SCOPE;
export const EMAIL_ADDRESS_CHANGE_SCOPE = scopes.EMAIL_ADDRESS_CHANGE_SCOPE;
export const MOBILE_NUMBER_CHANGE_SCOPE = scopes.MOBILE_NUMBER_CHANGE_SCOPE;
export const ADDRESS_CHANGE_SCOPE = scopes.ADDRESS_CHANGE_SCOPE;
export const BIOMETRICS_CHANGE_SCOPE = scopes.BIOMETRICS_CHANGE_SCOPE;
export const PASSCODE_CHANGE_SCOPE = scopes.PASSCODE_CHANGE_SCOPE;
export const TEST_OTP_STEP_EXTRA_SCOPE = scopes.TEST_OTP_STEP_EXTRA_SCOPE;
export const TEST_BIOMETRICS_STEP_EXTRA_SCOPE = scopes.TEST_BIOMETRICS_STEP_EXTRA_SCOPE;

export const USER_TABLE = tables.USER_TABLE;
export const AUTH_TRANSACTIONS_TABLE = tables.AUTH_TRANSACTIONS_TABLE;
export const AUTH_KEYS_TABLE = tables.AUTH_KEYS_TABLE;
export const AUTH_CODES_TABLE = tables.AUTH_CODES_TABLE;
export const AUTH_TOKENS_TABLE = tables.AUTH_TOKENS_TABLE;
export const AUTH_REFRESH_TOKENS_TABLE = tables.AUTH_REFRESH_TOKENS_TABLE;
export const AUTH_HASHES_TABLE = tables.AUTH_HASHES_TABLE;
export const LEGACY_AUTH_TABLE = tables.LEGACY_AUTH_TABLE;
export const LEGACY_RSA_TABLE = tables.LEGACY_RSA_TABLE;
export const LEGACY_AUTH_BACKUP_TABLE = tables.LEGACY_AUTH_BACKUP_TABLE;
export const LEGACY_RSA_BACKUP_TABLE = tables.LEGACY_RSA_BACKUP_TABLE;
export const APR_INCREASES_TABLE = tables.APR_INCREASES_TABLE;
export const RATE_LIMITING_TABLE = tables.RATE_LIMITING_TABLE;

export const NON_CONFLICT_SCOPES_PARAM = params.NON_CONFLICTING_SCOPES_PARAM;
export const EXCLUSIVE_SCOPES_PARAM = params.EXCLUSIVE_SCOPES_PARAM;
export const AUTH_FLOW_SCOPES_PARAM = params.AUTH_FLOW_SCOPES_PARAM;
export const SCOPE_TO_RESOURCE_MAP_PARAM = params.SCOPE_TO_RESOURCE_MAP_PARAM;
export const SCOPE_TO_RESOURCE_MAP_URL_PARAM = params.SCOPE_TO_RESOURCE_MAP_URL_PARAM;
export const TOKEN_LIFETIMES_PARAM = params.TOKEN_LIFETIMES_PARAM;
export const STAFF_ONMOUUIDS_PARAM = params.STAFF_ONMOUUIDS_PARAM;
export const APP_TESTER_LOGIN_CONFIG = params.APP_TESTER_LOGIN_CONFIG;

export const RATE_LIMITING_PARAM = nonStandardParams.RATE_LIMITING_PARAM;
export const DOWNLOAD_APP_REDIRECT_URL_CONFIG = nonStandardParams.DOWNLOAD_APP_REDIRECT_URL_CONFIG;

export const ONMO_AUTH_URL = urls.ONMO_AUTH_URL;
export const ONMO_API_URL = urls.ONMO_API_URL;
export const FRONTEND_URL = urls.FRONTEND_URL;

export const POSTHOG_NOTIFICATION_FLAG_KEY = posthog.POSTHOG_NOTIFICATION_FLAG_KEY;
export const POSTHOG_SECRET_NAME = posthog.POSTHOG_SECRET_NAME;
export const POSTHOG_HAL_FLAG_KEY = posthog.POSTHOG_HAL_FLAG_KEY;

export const NOTIFICATIONS_SFMC_SECRET_NAME = secrets.NOTIFICATIONS_SFMC_SECRET_NAME;

export const APR_GATEWAY_ID = gateways.APR_GATEWAY_ID;
export const CUSTOMER_CARE_GATEWAY_ID = gateways.CUSTOMER_CARE_GATEWAY_ID;
export const API_BROKER_GATEWAY_ID = gateways.API_BROKER_GATEWAY_ID;
export const AUTHENTICATION_GATEWAY_ID = gateways.AUTHENTICATION_GATEWAY_ID;
export const CARD_SERVICE_OIDC_GATEWAY_ID = gateways.CARD_SERVICE_OIDC_GATEWAY_ID;
export const ACCOUNT_SERVICE_OIDC_GATEWAY_ID = gateways.ACCOUNT_SERVICE_OIDC_GATEWAY_ID;
export const CUSTOMER_SERVICE_OIDC_GATEWAY_ID = gateways.CUSTOMER_SERVICE_OIDC_GATEWAY_ID;
export const REPAYMENT_SERVICE_GATEWAY_ID = gateways.REPAYMENT_SERVICE_GATEWAY_ID;
export const ALERT_SERVICE_OIDC_GATEWAY_ID = gateways.ALERT_SERVICE_OIDC_GATEWAY_ID;
export const TRANSACTION_SERVICE_OIDC_GATEWAY_ID = gateways.TRANSACTION_SERVICE_OIDC_GATEWAY_ID;
export const DEVICE_CHANNEL_GATEWAY_ID = gateways.DEVICE_CHANNEL_GATEWAY_ID;
export const BIOMETRICS_SERVICE_GATEWAY_ID = gateways.BIOMETRICS_SERVICE_GATEWAY_ID;

// e2e test tables (not used by Lambda handlers)
export const CUSTOMER_TO_CARD_MAPPING_TABLE =
  process.env.CUSTOMER_TO_CARD_MAPPING_TABLE ?? ("customer-to-card-mapping-staging" as string);

// ── Application constants (from config/app.yaml) ────────────────────────────

export const {
  OTP_SEND_LIMIT,
  OTP_ATTEMPT_LIMIT,
  PASSCODE_ATTEMPT_LIMIT,
  CARD_SERVICE_TIMEOUT,
  CARD_SERVICE_MAX_RETRIES,
} = app.limits;
export const {
  COMPLETED_STATUS,
  OTP_SEND_LIMIT_REACHED,
  OTP_EXPIRED_SEND_LIMIT_REACHED,
  OTP_EXPIRED_RESEND,
  OTP_INVALID_ATTEMPT_LIMIT_REACHED,
  OTP_INVALID_REATTEMPT,
  PASSCODE_INVALID_ATTEMPT_LIMIT_REACHED,
  PASSCODE_INVALID_REATTEMPT,
  REFRESH_TOKEN_EXPIRED,
} = app.statuses;
export const { INTERATIONS, KEY_LENGTH, DIGEST } = app.crypto;
export const {
  OTP_AUTH_FLOW,
  OTP_PASSCODE_AUTH_FLOW,
  EXTRA_SCOPE_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_IN_AUTH_FLOW,
  FORGOTTEN_PASSCODE_LOGGED_OUT_AUTH_FLOW,
  BIOMETRICS_REGISTRATION_AUTH_FLOW,
  BIOMETRICS_AUTH_FLOW,
} = app.auth_flows;
export const {
  EXTRA_SCOPE_OTP_PASSCODE_FLOW,
  EXTRA_SCOPE_PASSCODE_FLOW,
  EXTRA_SCOPE_BIOMETRICS_FLOW,
  EMAIL_CHANGE_FLOW,
  PHONE_NUMBER_CHANGE_FLOW,
} = app.extra_scope_flows;
export const { FIRST_TIME_LOGIN_FLOW, RELOGIN_FLOW } = app.login_flows;
export const {
  LOGIN_SCENARIO_RELOGIN_RECOGNIZED_DEVICE,
  LOGIN_SCENARIO_FIRST_TIME_NEW_DEVICE,
  LOGIN_SCENARIO_FIRST_TIME_EXISTING_CUSTOMER,
  LOGIN_SCENARIO_FIRST_TIME_NEW_CUSTOMER,
} = app.login_scenarios;
export const { SUPPORTED_CREDIT_ACCOUNT_STATES, CORE_BANKING_ADAPTER_CLIENT_NAME } = app.banking;
export const { APP_TOKEN_DOMAIN, WEB_TOKEN_DOMAIN } = app.token_domains;
export const { HTTP_OK, HTTP_UNAUTHORIZED, HTTP_RATELIMITTED, HTTP_SERVER_ERROR } = app.http;

// ── Computed values ─────────────────────────────────────────────────────────
// Only computed/runtime values belong here — static values go in config/app.yaml

export const FIFTEEN_MINUTES = 15 * 60;
export const FIVE_MINUTES = 5 * 60;
export const SIXTY_SECONDS = 60;

export const SERVER_ERROR_RESPONSE = apiResponse(HTTP_SERVER_ERROR, {
  message: "Something went wrong",
});

export const UNAUTHORIZED_RESPONSE = apiResponse(HTTP_UNAUTHORIZED, { message: "Unauthorized" });
