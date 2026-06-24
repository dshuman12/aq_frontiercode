import { APR_SCOPE, ENV } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

/**
 * apr is one of two external gateways that encode the environment name in
 * the methodArn stage slot (the other is api-broker), hence `stage: ENV`.
 */
export const routes: RouteWithoutGateway[] = [
  { stage: ENV, method: "POST", path: "/*/opt-out/verify-otp", scopes: [APR_SCOPE] },
  { stage: ENV, method: "GET", path: "/*", scopes: [APR_SCOPE] },
  { stage: ENV, method: "GET", path: "/*/change", scopes: [APR_SCOPE] },
  { stage: ENV, method: "GET", path: "/*/declined", scopes: [APR_SCOPE] },
  { stage: ENV, method: "POST", path: "/*/opt-out/send-otp", scopes: [APR_SCOPE] },
];
