import { compiledRoutes, type CompiledRoute } from "@functions/general/authorizer/scope-map";

/**
 * Route-metadata-based authorizer lookup.
 *
 * Companion to the legacy `authorizer.libs.ts:isResourceValidForScopes`
 * (regex scan over placeholder-substituted patterns). Source of truth
 * for the scope→route map is
 * `src/functions/general/authorizer/scope-map/` (plain TS code). Gateway
 * IDs are injected by Terraform via the `GATEWAY_IDS` env var and
 * resolved inside the scope-map module at cold start.
 *
 * During shadow mode (phase 5) this path runs alongside the old one; the
 * old path still decides. Phase 6 cutover deletes the old path.
 */

// Convert an execute-api ARN pattern to a RegExp. Each `*` matches one
// path segment (anything except `/`). The ARN pattern never contains
// `{...}` placeholders — those were resolved at Terraform apply time
// (for gateway ids) or normalised in the TS route map (for path params).
// Exported for unit testing.
export const arnPatternToRegex = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("^" + escaped.replace(/\*/g, "[^/]+") + "$");
};

type CompiledMatcher = CompiledRoute & { regex: RegExp };

const compiledMatchers: CompiledMatcher[] = compiledRoutes.map((route) => ({
  ...route,
  regex: arnPatternToRegex(route.arnPattern),
}));

export type RouteLookupResult = {
  decision: boolean;
  matchedPath: "local" | "external" | "none";
  matchedScope?: string;
  matchedRoute?: string;
};

export const lookupByRouteMetadata = ({
  methodArn,
  scopesString,
}: {
  methodArn: string;
  scopesString: string;
}): RouteLookupResult => {
  const tokenScopes = scopesString.split(",").map((s) => s.trim());

  for (const route of compiledMatchers) {
    if (!route.regex.test(methodArn)) continue;
    const matchedScope = route.scopes.find((s) => tokenScopes.includes(s));
    if (matchedScope) {
      return {
        decision: true,
        matchedPath: route.source,
        matchedScope,
        matchedRoute: route.arnPattern,
      };
    }
  }

  return { decision: false, matchedPath: "none" };
};
