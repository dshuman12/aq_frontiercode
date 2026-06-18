import { CUSTOMER_PROFILE_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/*", scopes: [CUSTOMER_PROFILE_SCOPE] },
  { stage: "*", method: "PATCH", path: "/*", scopes: [CUSTOMER_PROFILE_SCOPE] },
  { stage: "*", method: "POST", path: "/*/confirm-address", scopes: [CUSTOMER_PROFILE_SCOPE] },
  {
    stage: "*",
    method: "GET",
    path: "/*/communications-preferences",
    scopes: [CUSTOMER_PROFILE_SCOPE],
  },
  {
    stage: "*",
    method: "PATCH",
    path: "/*/communications-preferences",
    scopes: [CUSTOMER_PROFILE_SCOPE],
  },
];
