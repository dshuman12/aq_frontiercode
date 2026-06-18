import { CREDIT_CARD_ACCOUNT_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/accounts/*", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: "*",
    method: "POST",
    path: "/transaction-challenge-response",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  {
    stage: "*",
    method: "GET",
    path: "/transaction-challenge/*",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
];
