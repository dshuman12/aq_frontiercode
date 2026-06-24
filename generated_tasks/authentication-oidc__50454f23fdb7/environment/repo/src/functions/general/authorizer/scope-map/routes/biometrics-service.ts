import { BIOMETRICS_CHECK_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "GET", path: "/history/me", scopes: [BIOMETRICS_CHECK_SCOPE] },
  {
    stage: "*",
    method: "POST",
    path: "/biometric-check/*/start",
    scopes: [BIOMETRICS_CHECK_SCOPE],
  },
];
