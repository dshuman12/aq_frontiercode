import {
  CLM_SCOPE,
  CREDIT_CARD_ACCOUNT_SCOPE,
  CREDIT_CARD_ACTIVATION_SCOPE,
  CUSTOMER_CARE_SCOPE,
  CUSTOMER_PROFILE_SCOPE,
  DEBIT_CARD_ACCOUNT_SCOPE,
  DIRECT_DEBIT_SCOPE,
  ENV,
  SUPPORT_SERVICES_SCOPE,
} from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

/**
 * api-broker is one of two external gateways that encode the environment
 * name in the methodArn stage slot (the other is apr), hence `stage: ENV`.
 */
export const routes: RouteWithoutGateway[] = [
  { stage: ENV, method: "GET", path: "/account/clm/*", scopes: [CLM_SCOPE] },
  { stage: ENV, method: "PUT", path: "/account/clm/*", scopes: [CLM_SCOPE] },
  { stage: ENV, method: "PUT", path: "/account/clm/*/limit-change", scopes: [CLM_SCOPE] },
  { stage: ENV, method: "GET", path: "/account/clm/*/offer-validity", scopes: [CLM_SCOPE] },
  {
    stage: ENV,
    method: "GET",
    path: "/repayment/card/customer-care",
    scopes: [CUSTOMER_CARE_SCOPE],
  },
  { stage: ENV, method: "POST", path: "/account/editprofile", scopes: [CUSTOMER_PROFILE_SCOPE] },
  {
    stage: ENV,
    method: "POST",
    path: "/account/editprofile/verifyemail",
    scopes: [CUSTOMER_PROFILE_SCOPE],
  },
  {
    stage: ENV,
    method: "GET",
    path: "/passcode/email-validation-check",
    scopes: [CUSTOMER_PROFILE_SCOPE],
  },
  { stage: ENV, method: "POST", path: "/passcode/email-check", scopes: [CUSTOMER_PROFILE_SCOPE] },
  { stage: ENV, method: "GET", path: "/account/customer", scopes: [CUSTOMER_PROFILE_SCOPE] },
  { stage: ENV, method: "POST", path: "/mobile/store-token", scopes: [SUPPORT_SERVICES_SCOPE] },
  { stage: ENV, method: "GET", path: "/account/postcodecheck", scopes: [SUPPORT_SERVICES_SCOPE] },
  { stage: ENV, method: "GET", path: "/account/statement", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: ENV, method: "POST", path: "/account/creditcard", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: ENV,
    method: "GET",
    path: "/account/bankingdetail/transaction",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  {
    stage: ENV,
    method: "GET",
    path: "/account/bankingdetail/loan-transaction",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  { stage: ENV, method: "GET", path: "/card/image", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: ENV,
    method: "GET",
    path: "/account/bankingdetail",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  {
    stage: ENV,
    method: "GET",
    path: "/repayment/card/hashcode",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  { stage: ENV, method: "GET", path: "/account/payees-list", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: ENV, method: "GET", path: "/account/payee/list", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: ENV, method: "POST", path: "/account/payee", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: ENV, method: "POST", path: "/account/transfer", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: ENV, method: "POST", path: "/card/status", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: ENV, method: "GET", path: "/account/terms", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: ENV,
    method: "POST",
    path: "/repayment/directdebit/setup",
    scopes: [DIRECT_DEBIT_SCOPE],
  },
  {
    stage: ENV,
    method: "GET",
    path: "/repayment/directdebit/bank-details-lookup",
    scopes: [DIRECT_DEBIT_SCOPE],
  },
  { stage: ENV, method: "PUT", path: "/repayment/directdebit/setup", scopes: [DIRECT_DEBIT_SCOPE] },
  {
    stage: ENV,
    method: "GET",
    path: "/repayment/directdebit/payment-in-process",
    scopes: [DIRECT_DEBIT_SCOPE],
  },
  {
    stage: ENV,
    method: "POST",
    path: "/deposit/addsourceoffunds",
    scopes: [DEBIT_CARD_ACCOUNT_SCOPE],
  },
  { stage: ENV, method: "POST", path: "/card/activate", scopes: [CREDIT_CARD_ACTIVATION_SCOPE] },
  { stage: ENV, method: "GET", path: "/mobile/resendpin", scopes: [CREDIT_CARD_ACTIVATION_SCOPE] },
];
