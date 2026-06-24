import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { FIRST_TIME_LOGIN_SCOPE } from "@libs/config";
import { getParameter } from "@onmoapp/onmo-ssm";
import { noScopeConflict } from "@libs/scopes";

type ValidateScopesParams = {
  requestScope: string;
  non_conflict_scopes_param: string;
  exclusive_scopes_param: string;
};

type ValidateScopesResult = {
  newScopes: string[];
  exclusiveScopes: string[];
};

export async function validateScopes({
  requestScope,
  non_conflict_scopes_param,
  exclusive_scopes_param,
}: ValidateScopesParams): Promise<ValidateScopesResult> {
  const newScopes = requestScope.split(",");

  if (newScopes.includes(FIRST_TIME_LOGIN_SCOPE)) {
    throw new Error(`Invalid scope in request: ${FIRST_TIME_LOGIN_SCOPE}`);
  }

  const [{ Parameter: nonConflictParameter }, { Parameter: exclusiveParameter }] =
    await Promise.all([
      getParameter({ Name: non_conflict_scopes_param }),
      getParameter({ Name: exclusive_scopes_param }),
    ]);
  if (!nonConflictParameter?.Value || !exclusiveParameter?.Value) {
    throw new Error(`Failed to fetch parameters from ssm`);
  }
  const nonConflictGroups = JSON.parse(nonConflictParameter.Value) as string[][];
  const exclusiveScopes = JSON.parse(exclusiveParameter.Value) as string[];

  const noScopeConflicts = noScopeConflict({ newScopes: newScopes, nonConflictGroups });
  if (!noScopeConflicts) {
    throw new Error(`Conflict in requested scope: ${requestScope}`);
  }
  const { OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP } = await getSpecificScopeToResourceMaps();
  for (const scopeItem of newScopes) {
    const trimmedScope = scopeItem.trim();
    if (!(trimmedScope in OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP)) {
      throw new Error(`Scope ${trimmedScope} not currently supported`);
    }
  }

  return {
    newScopes,
    exclusiveScopes,
  };
}
