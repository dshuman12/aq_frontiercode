import {
  CREDIT_CARD_ACCOUNT_SCOPE,
  CREDIT_CARD_DETAILS_SCOPE,
  CREDIT_CARD_FREEZE_SCOPE,
  CREDIT_CARD_UNFREEZE_SCOPE,
} from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/*", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: "*", method: "POST", path: "/*/activate", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: "*", method: "POST", path: "/*/pin", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: "*", method: "POST", path: "/*/void", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  { stage: "*", method: "GET", path: "/*/pin-status", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
  {
    stage: "*",
    method: "GET",
    path: "/public-encryption-key",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  {
    stage: "*",
    method: "POST",
    path: "/public-encryption-key",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
  { stage: "*", method: "GET", path: "/*/pin", scopes: [CREDIT_CARD_DETAILS_SCOPE] },
  { stage: "*", method: "GET", path: "/*/pan", scopes: [CREDIT_CARD_DETAILS_SCOPE] },
  { stage: "*", method: "GET", path: "/*/cvv", scopes: [CREDIT_CARD_DETAILS_SCOPE] },
  { stage: "*", method: "POST", path: "/*/freeze", scopes: [CREDIT_CARD_FREEZE_SCOPE] },
  { stage: "*", method: "POST", path: "/*/unfreeze", scopes: [CREDIT_CARD_UNFREEZE_SCOPE] },
];
