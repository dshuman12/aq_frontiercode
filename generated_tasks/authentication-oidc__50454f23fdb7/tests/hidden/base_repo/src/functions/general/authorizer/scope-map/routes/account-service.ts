import { CREDIT_CARD_ACCOUNT_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/credit/*", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: "*", method: "PATCH", path: "/credit/*", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: "*",
    method: "POST",
    path: "/credit/*/document/generate-url",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  { stage: "*", method: "GET", path: "/credit/*/documents", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: "*",
    method: "GET",
    path: "/credit/*/balance-breakdown",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
];
