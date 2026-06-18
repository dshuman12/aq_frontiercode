import { createHash } from "crypto";
import { DecodedToken } from "@libs/crypto";
import { APIGatewayAuthorizerResult, StatementEffect } from "aws-lambda";
import { getScopeToResourceMap } from "@functions/general/authorizer/authorizer.constants";
import { lookupByRouteMetadata } from "@functions/general/authorizer/authorizer.route-lookup";
import { logger } from "@onmoapp/logger";

const SHADOW_ENABLED = process.env.ROUTE_SCOPE_LOOKUP_SHADOW === "true";

type GeneratePolicyInput = { effect: string; resource: string; decodedToken: DecodedToken };

export const generatePolicy = ({
  effect,
  resource,
  decodedToken,
}: GeneratePolicyInput): APIGatewayAuthorizerResult => {
  return {
    principalId: decodedToken.sub as string,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        { Action: "execute-api:Invoke", Effect: effect as StatementEffect, Resource: resource },
      ],
    },
    context: { onmouuid: decodedToken.sub, scope: decodedToken.scope, token_id: decodedToken.jti },
  };
};

const getPatternSpecificity = (pattern: string) => {
  const segments = pattern?.split("/");
  return segments?.reduce((score, segment) => {
    if (segment === "*") return score;
    return score + 1;
  }, 0);
};

type IsResourceValidForScopesInput = { methodArn: string; scopesString: string };
type PatternMatch = {
  scope: string;
  pattern: string;
  specificity: number;
};

export const isResourceValidForScopes = async ({
  methodArn,
  scopesString,
}: IsResourceValidForScopesInput): Promise<boolean> => {
  const scopes = scopesString.split(",").map((scope) => scope.trim());
  const { SCOPE_TO_RESOURCE_MAP } = await getScopeToResourceMap();

  const matchingPatterns: PatternMatch[] = [];
  let highestSpecificity = 0;

  const entries = Object.entries(SCOPE_TO_RESOURCE_MAP);
  for (const [scope, patterns] of entries) {
    for (const pattern of patterns) {
      const regexPattern =
        "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
      const regex = new RegExp(regexPattern);

      if (regex.test(methodArn)) {
        const specificity = getPatternSpecificity(pattern);

        if (specificity > highestSpecificity) {
          matchingPatterns.length = 0;
          highestSpecificity = specificity;
        }
        if (specificity === highestSpecificity) {
          matchingPatterns.push({
            scope,
            pattern,
            specificity,
          });
        }
      }
    }
  }
  const oldDecision =
    matchingPatterns.length > 0 && matchingPatterns.some((match) => scopes.includes(match.scope));

  if (SHADOW_ENABLED) {
    // Run the new route-metadata lookup alongside the old regex. Always trust
    // the old decision — shadow mode is observation only. Divergences feed
    // the `OnmoAuth/ScopeLookup:ScopeLookupDivergence` CloudWatch metric
    // plus structured logs for coverage/debug dashboards.
    try {
      runShadowComparison({ methodArn, scopesString, oldDecision });
    } catch (error) {
      logger.warn(`Shadow comparison errored: ${(error as Error).message}`);
    }
  }

  return oldDecision;
};

const hashScopes = (scopesString: string): string =>
  createHash("sha256").update(scopesString).digest("hex").slice(0, 12);

type ShadowComparisonInput = {
  methodArn: string;
  scopesString: string;
  oldDecision: boolean;
};

const runShadowComparison = ({ methodArn, scopesString, oldDecision }: ShadowComparisonInput) => {
  const result = lookupByRouteMetadata({ methodArn, scopesString });

  const divergence = result.decision !== oldDecision;

  // AsyncLocalStorage-scoped context — carries through to every log in
  // this invocation. Drives the coverage dashboard (filter by
  // shadow.matchedRoute to confirm every inventoried route has been hit)
  // and the divergence log below.
  logger.addContext("scope_lookup_shadow", {
    methodArn,
    matchedPath: result.matchedPath,
    matchedScope: result.matchedScope,
    matchedRoute: result.matchedRoute,
    oldDecision,
    newDecision: result.decision,
    tokenScopesHash: hashScopes(scopesString),
    divergence,
  });

  if (divergence) {
    logger.warn("scope lookup divergence");
  }
};
