import { DecodedToken } from "@libs/crypto";
import { APIGatewayAuthorizerResult, StatementEffect } from "aws-lambda";
import { getScopeToResourceMap } from "@functions/general/authorizer/authorizer.constants";
import { Logger, LogLevel } from "@onmoapp/onmo-logger";

type GeneratePolicyInput = { effect: string; resource: string; decodedToken: DecodedToken };
const env = process.env.ENVIRONMENT as string;

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
  const logger = new Logger({ env }, (process.env.LOGGING_LEVEL as LogLevel) || "INFO");
  logger.addContext({
    methodArn,
    scopesString,
  });
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
  if (matchingPatterns.length === 0) return false;

  return matchingPatterns.some((match) => scopes.includes(match.scope));
};
