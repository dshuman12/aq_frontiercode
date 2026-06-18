import { AWS_ACCOUNT_ID, REGION } from "@libs/config";
import { gatewayIds } from "./gateway-ids";
import { routes } from "./routes";
import type { CompiledRoute, RouteEntry } from "./types";

export type { CompiledRoute, GatewayKey, RouteEntry } from "./types";
export { gatewayIds } from "./gateway-ids";
export { routes } from "./routes";

const arnPrefix = `arn:aws:execute-api:${REGION}:${AWS_ACCOUNT_ID}`;

// `authentication` routes use a wildcard in the gateway-id slot because
// the authentication gateway's id isn't in `gatewayIds` (would cycle in
// Terraform — see `./types.ts`). Safe: this authorizer is only attached
// to the authentication gateway, so the invoking methodArn's gateway-id
// slot is always the authentication gateway at runtime.
const gatewayIdSlot = (gateway: RouteEntry["gateway"]): string =>
  gateway === "authentication" ? "*" : gatewayIds[gateway];

export const compileRoute = (route: RouteEntry): CompiledRoute => ({
  arnPattern: `${arnPrefix}:${gatewayIdSlot(route.gateway)}/${route.stage}/${route.method}${route.path}`,
  scopes: route.scopes,
  source: route.gateway === "authentication" ? "local" : "external",
});

/**
 * Full list of compiled routes delivered to the authorizer lookup path.
 * Composed once at module load (Lambda cold start).
 */
export const compiledRoutes: CompiledRoute[] = routes.map(compileRoute);
