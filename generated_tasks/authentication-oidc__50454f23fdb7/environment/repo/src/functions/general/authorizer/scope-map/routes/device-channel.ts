import { CREDIT_CARD_ACCOUNT_SCOPE } from "@libs/config";
import type { RouteWithoutGateway } from "./with-gateway";

// device-channel is a WebSocket API. `$connect` has no path component;
// the empty `path` keeps the composed ARN as `gw/<stage>/$connect`.
export const routes: RouteWithoutGateway[] = [
  { stage: "*", method: "$connect", path: "", scopes: [CREDIT_CARD_ACCOUNT_SCOPE] },
];
