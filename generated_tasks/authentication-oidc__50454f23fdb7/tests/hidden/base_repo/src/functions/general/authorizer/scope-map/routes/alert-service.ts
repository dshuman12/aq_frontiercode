import { CREDIT_CARD_ACCOUNT_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  {
    stage: "*",
    method: "POST",
    path: "/account-credit-alerts",
    scopes: [CREDIT_CARD_ACCOUNT_SCOPE],
  },
];
