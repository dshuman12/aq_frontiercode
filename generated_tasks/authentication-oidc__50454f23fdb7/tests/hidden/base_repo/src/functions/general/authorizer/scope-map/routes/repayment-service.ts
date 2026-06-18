import { REPAYMENT_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/cards", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "GET", path: "/direct-debit", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "POST", path: "/direct-debit", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "GET", path: "/direct-debit/*", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "DELETE", path: "/direct-debit/*", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "POST", path: "/direct-debit/hosted", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "PUT", path: "/direct-debit/hosted", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "GET", path: "/mandate/*", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "DELETE", path: "/mandate/*", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "POST", path: "/one-off-payment/card", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "POST", path: "/one-off-payment/pay-by-bank", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "GET", path: "/payment-receipt/*", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "POST", path: "/one-off-payment/checkout", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "POST", path: "/one-off-payment/intent", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "GET", path: "/payment-status/*", scopes: [REPAYMENT_SCOPE] },
  { stage: "*", method: "GET", path: "/cpa/subscription", scopes: [REPAYMENT_SCOPE] },
];
