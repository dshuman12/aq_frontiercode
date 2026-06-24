import {
  AUTH_SERVICES_SCOPE,
  BIOMETRICS_CHANGE_SCOPE,
  CREDIT_CARD_ACCOUNT_ID_SCOPE,
  CREDIT_CARD_ID_SCOPE,
  EMAIL_ADDRESS_CHANGE_SCOPE,
  FIRST_TIME_LOGIN_SCOPE,
  LOAN_ACCOUNT_ID_SCOPE,
  MOBILE_NUMBER_CHANGE_SCOPE,
  PASSCODE_CHANGE_SCOPE,
} from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

/**
 * Routes on this service's own REST API Gateway (`${env}-authentication`).
 * Every entry corresponds 1:1 to a route in `terraform/3-gateway.tf` that
 * has `lambda_authorizer_name = module.authorizer.name` — guarded by
 * `authentication.drift.test.ts`.
 *
 * Path syntax: single-segment wildcards are written as `*` to match the
 * resolved methodArn shape. API Gateway's own `{transaction_id}`
 * templating stays in `3-gateway.tf` where the HTTP route is declared.
 */
export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "POST", path: "/logout", scopes: [AUTH_SERVICES_SCOPE] },
  { stage: "*", method: "POST", path: "/eligibility", scopes: [AUTH_SERVICES_SCOPE] },
  {
    stage: "*",
    method: "GET",
    path: "/user-info",
    scopes: [LOAN_ACCOUNT_ID_SCOPE, CREDIT_CARD_ACCOUNT_ID_SCOPE, CREDIT_CARD_ID_SCOPE],
  },
  { stage: "*", method: "POST", path: "/change-passcode", scopes: [PASSCODE_CHANGE_SCOPE] },
  {
    stage: "*",
    method: "POST",
    path: "/authorize/forgotten-passcode/logged-in",
    scopes: [AUTH_SERVICES_SCOPE],
  },

  // biometrics register
  {
    stage: "*",
    method: "POST",
    path: "/authorize/biometrics/register",
    scopes: [BIOMETRICS_CHANGE_SCOPE, FIRST_TIME_LOGIN_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/biometrics/register",
    scopes: [BIOMETRICS_CHANGE_SCOPE, FIRST_TIME_LOGIN_SCOPE],
  },

  // extra-scope
  { stage: "*", method: "POST", path: "/authorize/extra-scope", scopes: [AUTH_SERVICES_SCOPE] },
  { stage: "*", method: "POST", path: "/*/extra-scope/otp/send", scopes: [AUTH_SERVICES_SCOPE] },
  { stage: "*", method: "POST", path: "/*/extra-scope/otp/resend", scopes: [AUTH_SERVICES_SCOPE] },
  { stage: "*", method: "POST", path: "/*/extra-scope/otp/verify", scopes: [AUTH_SERVICES_SCOPE] },
  {
    stage: "*",
    method: "POST",
    path: "/*/extra-scope/passcode/verify",
    scopes: [AUTH_SERVICES_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/extra-scope/biometrics/verify",
    scopes: [AUTH_SERVICES_SCOPE],
  },

  // email-change
  {
    stage: "*",
    method: "POST",
    path: "/*/email-change/initiate",
    scopes: [AUTH_SERVICES_SCOPE, EMAIL_ADDRESS_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/email-change/validate",
    scopes: [AUTH_SERVICES_SCOPE, EMAIL_ADDRESS_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/email-change/email/resend",
    scopes: [AUTH_SERVICES_SCOPE],
  },
  { stage: "*", method: "POST", path: "/*/email-change/otp/resend", scopes: [AUTH_SERVICES_SCOPE] },

  // phone-change
  {
    stage: "*",
    method: "POST",
    path: "/*/phone-change/initiate",
    scopes: [AUTH_SERVICES_SCOPE, MOBILE_NUMBER_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/phone-change/otp/verify",
    scopes: [AUTH_SERVICES_SCOPE, MOBILE_NUMBER_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/phone-change/otp/resend",
    scopes: [AUTH_SERVICES_SCOPE, MOBILE_NUMBER_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/phone-change/email/send",
    scopes: [AUTH_SERVICES_SCOPE, MOBILE_NUMBER_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/phone-change/email/verify",
    scopes: [AUTH_SERVICES_SCOPE, MOBILE_NUMBER_CHANGE_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/*/phone-change/email/resend",
    scopes: [AUTH_SERVICES_SCOPE, MOBILE_NUMBER_CHANGE_SCOPE],
  },
];
