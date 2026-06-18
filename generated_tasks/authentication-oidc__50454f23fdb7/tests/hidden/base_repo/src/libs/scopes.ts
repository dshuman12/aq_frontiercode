type NoScopeConflictInput = { newScopes: string[]; nonConflictGroups: string[][] };
export const noScopeConflict = ({ newScopes, nonConflictGroups }: NoScopeConflictInput) => {
  return nonConflictGroups.some((group) => newScopes.every((scope) => group.includes(scope)));
};

type NoExclusiveScopeInput = {
  newScopes: string[];
  existingScopes: string[];
  exclusiveScopes: string[];
};
export const noExclusiveScope = ({
  newScopes,
  existingScopes,
  exclusiveScopes = [],
}: NoExclusiveScopeInput) => {
  const exclusiveConflict = newScopes
    .filter((scope) => exclusiveScopes.includes(scope))
    .some((scope) => existingScopes.includes(scope));

  return !exclusiveConflict;
};
