import { describe, it, expect, vi, beforeEach } from "vitest";
import { getParameter } from "@onmoapp/onmo-ssm";
import { getSpecificScopeToResourceMaps } from "@functions/general/authorizer/authorizer.constants";
import { noScopeConflict } from "@libs/scopes";
import { FIRST_TIME_LOGIN_SCOPE } from "@libs/config";
import { validateScopes } from "./scope-validations";

// Mock the dependencies
vi.mock("@onmoapp/onmo-ssm", () => ({
  getParameter: vi.fn(),
}));

vi.mock("@functions/general/authorizer/authorizer.constants", () => ({
  getSpecificScopeToResourceMaps: vi.fn(),
}));

vi.mock("@libs/scopes", () => ({
  noScopeConflict: vi.fn(),
}));

// Mock constants to ensure FIRST_TIME_LOGIN_SCOPE has a value
vi.mock("@libs/config", async () => {
  const actual = await vi.importActual("@libs/config");
  return {
    ...actual,
    FIRST_TIME_LOGIN_SCOPE:
      (actual as Record<string, unknown>).FIRST_TIME_LOGIN_SCOPE || "first-time-login",
  };
});

describe("validateScopes", () => {
  const non_conflict_scopes_param = "test-non-conflict-scopes-param";
  const exclusive_scopes_param = "test-exclusive-scopes-param";

  const mockNonConflictGroups = [
    ["scope1", "scope2"],
    ["scope3", "scope4"],
  ];
  const mockExclusiveScopes = ["exclusive-scope1", "exclusive-scope2"];
  const mockScopeToResourceMap = {
    scope1: ["resource1"],
    scope2: ["resource2"],
    scope3: ["resource3"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully validate scopes and return newScopes and exclusiveScopes", async () => {
    const requestScope = "scope1,scope2";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockResolvedValue({
      OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: mockScopeToResourceMap,
    });

    const result = await validateScopes({
      requestScope,
      non_conflict_scopes_param,
      exclusive_scopes_param,
    });

    expect(result).toEqual({
      newScopes: ["scope1", "scope2"],
      exclusiveScopes: mockExclusiveScopes,
    });

    expect(getParameter).toHaveBeenCalledTimes(2);
    expect(getParameter).toHaveBeenCalledWith({ Name: non_conflict_scopes_param });
    expect(getParameter).toHaveBeenCalledWith({ Name: exclusive_scopes_param });

    expect(noScopeConflict).toHaveBeenCalledWith({
      newScopes: ["scope1", "scope2"],
      nonConflictGroups: mockNonConflictGroups,
    });

    expect(getSpecificScopeToResourceMaps).toHaveBeenCalled();
  });

  it("should handle scopes with whitespace", async () => {
    const requestScope = " scope1 , scope2 ";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockResolvedValue({
      OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: mockScopeToResourceMap,
    });

    const result = await validateScopes({
      requestScope,
      non_conflict_scopes_param,
      exclusive_scopes_param,
    });

    expect(result.newScopes).toEqual([" scope1 ", " scope2 "]);
    expect(getSpecificScopeToResourceMaps).toHaveBeenCalled();
  });

  it("should throw error when FIRST_TIME_LOGIN_SCOPE is included", async () => {
    const requestScope = `scope1,${FIRST_TIME_LOGIN_SCOPE},scope2`;

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow(`Invalid scope in request: ${FIRST_TIME_LOGIN_SCOPE}`);

    expect(getParameter).not.toHaveBeenCalled();
    expect(noScopeConflict).not.toHaveBeenCalled();
    expect(getSpecificScopeToResourceMaps).not.toHaveBeenCalled();
  });

  it("should throw error when nonConflictParameter has no Value", async () => {
    const requestScope = "scope1,scope2";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: null },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("Failed to fetch parameters from ssm");

    expect(getParameter).toHaveBeenCalledTimes(2);
    expect(noScopeConflict).not.toHaveBeenCalled();
    expect(getSpecificScopeToResourceMaps).not.toHaveBeenCalled();
  });

  it("should throw error when exclusiveParameter has no Value", async () => {
    const requestScope = "scope1,scope2";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: undefined },
      });

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("Failed to fetch parameters from ssm");

    expect(getParameter).toHaveBeenCalledTimes(2);
    expect(noScopeConflict).not.toHaveBeenCalled();
    expect(getSpecificScopeToResourceMaps).not.toHaveBeenCalled();
  });

  it("should throw error when nonConflictParameter is missing", async () => {
    const requestScope = "scope1,scope2";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: null,
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("Failed to fetch parameters from ssm");
  });

  it("should throw error when scope conflict is detected", async () => {
    const requestScope = "scope1,scope2";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(false);

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow(`Conflict in requested scope: ${requestScope}`);

    expect(noScopeConflict).toHaveBeenCalled();
    expect(getSpecificScopeToResourceMaps).not.toHaveBeenCalled();
  });

  it("should throw error when scope is not in OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP", async () => {
    const requestScope = "scope1,unsupported-scope";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockResolvedValue({
      OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: mockScopeToResourceMap,
    });

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("Scope unsupported-scope not currently supported");
  });

  it("should throw error when trimmed scope is not in OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP", async () => {
    const requestScope = " scope1 , unsupported-scope ";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockResolvedValue({
      OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: mockScopeToResourceMap,
    });

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("Scope unsupported-scope not currently supported");
  });

  it("should handle single scope", async () => {
    const requestScope = "scope1";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockResolvedValue({
      OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: mockScopeToResourceMap,
    });

    const result = await validateScopes({
      requestScope,
      non_conflict_scopes_param,
      exclusive_scopes_param,
    });

    expect(result.newScopes).toEqual(["scope1"]);
    expect(result.exclusiveScopes).toEqual(mockExclusiveScopes);
  });

  it("should throw error when getParameter fails", async () => {
    const requestScope = "scope1,scope2";
    const mockError = new Error("SSM error");

    (getParameter as any).mockRejectedValue(mockError);

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("SSM error");
  });

  it("should throw error when getSpecificScopeToResourceMaps fails", async () => {
    const requestScope = "scope1,scope2";
    const mockError = new Error("Failed to get scope maps");

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockRejectedValue(mockError);

    await expect(
      validateScopes({
        requestScope,
        non_conflict_scopes_param,
        exclusive_scopes_param,
      }),
    ).rejects.toThrow("Failed to get scope maps");
  });

  it("should validate all scopes in the request", async () => {
    const requestScope = "scope1,scope2,scope3";

    (getParameter as any)
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockNonConflictGroups) },
      })
      .mockResolvedValueOnce({
        Parameter: { Value: JSON.stringify(mockExclusiveScopes) },
      });

    (noScopeConflict as any).mockReturnValue(true);

    (getSpecificScopeToResourceMaps as any).mockResolvedValue({
      OTP_PASSCODE_AUTH_SCOPE_TO_RESOURCE_MAP: {
        ...mockScopeToResourceMap,
        scope3: ["resource3"],
      },
    });

    const result = await validateScopes({
      requestScope,
      non_conflict_scopes_param,
      exclusive_scopes_param,
    });

    expect(result.newScopes).toEqual(["scope1", "scope2", "scope3"]);
  });
});
