import { CUSTOMER_CARE_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/accounts/*/arrears", scopes: [CUSTOMER_CARE_SCOPE] },
  { stage: "*", method: "GET", path: "/accounts/*/arrears/plan", scopes: [CUSTOMER_CARE_SCOPE] },
  {
    stage: "*",
    method: "GET",
    path: "/accounts/*/arrears/financials",
    scopes: [CUSTOMER_CARE_SCOPE],
  },
  {
    stage: "*",
    method: "GET",
    path: "/accounts/*/arrears/financials/budget",
    scopes: [CUSTOMER_CARE_SCOPE],
  },
  {
    stage: "*",
    method: "GET",
    path: "/accounts/*/arrears/screens/initial",
    scopes: [CUSTOMER_CARE_SCOPE],
  },
  { stage: "*", method: "PATCH", path: "/accounts/*/arrears", scopes: [CUSTOMER_CARE_SCOPE] },
  {
    stage: "*",
    method: "PATCH",
    path: "/accounts/*/arrears/financials",
    scopes: [CUSTOMER_CARE_SCOPE],
  },
];
