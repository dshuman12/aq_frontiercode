import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// vi.mock factories are hoisted; vi.hoisted lets us share captured mocks
// between the factory and the test bodies without TDZ errors.
const { mockApi, mockSync } = vi.hoisted(() => ({
  mockApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    shares: vi.fn(),
    invite: vi.fn(),
    updateShare: vi.fn(),
    revokeShare: vi.fn(),
    leave: vi.fn(),
  },
  mockSync: vi.fn(),
}));

vi.mock("./api", () => ({
  librariesApi: mockApi,
  libraryApi: { sync: (...a: unknown[]) => mockSync(...a) },
}));

import {
  useCreateLibrary,
  useDeleteLibrary,
  useInvite,
  useLeaveLibrary,
  useLibraries,
  useRevokeShare,
  useShares,
  useSyncLibrary,
  useUpdateLibrary,
  useUpdateShare,
} from "./hooks";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    qc,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  for (const fn of Object.values(mockApi)) fn.mockReset();
  mockSync.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useLibraries", () => {
  it("calls librariesApi.list and returns the result", async () => {
    mockApi.list.mockResolvedValue([]);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useLibraries(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.list).toHaveBeenCalled();
  });
});

describe("useCreateLibrary", () => {
  it("invokes librariesApi.create with the payload", async () => {
    mockApi.create.mockResolvedValue({ id: "new" });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateLibrary(), { wrapper: Wrapper });
    result.current.mutate({ name: "X", sourcePath: "/x" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // react-query 5 passes a 2nd `{ client, meta, mutationKey }` arg.
    expect(mockApi.create.mock.calls[0]?.[0]).toEqual({ name: "X", sourcePath: "/x" });
  });
});

describe("useUpdateLibrary", () => {
  it("invokes librariesApi.update with the bound id", async () => {
    mockApi.update.mockResolvedValue({ ok: true });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateLibrary("lib-7"), { wrapper: Wrapper });
    result.current.mutate({ name: "Renamed" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.update).toHaveBeenCalledWith("lib-7", { name: "Renamed" });
  });
});

describe("useDeleteLibrary", () => {
  it("invokes librariesApi.remove", async () => {
    mockApi.remove.mockResolvedValue(undefined);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteLibrary(), { wrapper: Wrapper });
    result.current.mutate("lib-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.remove.mock.calls[0]?.[0]).toBe("lib-1");
  });
});

describe("useLeaveLibrary", () => {
  it("invokes librariesApi.leave", async () => {
    mockApi.leave.mockResolvedValue({ ok: true });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useLeaveLibrary(), { wrapper: Wrapper });
    result.current.mutate("lib-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.leave.mock.calls[0]?.[0]).toBe("lib-1");
  });
});

describe("useShares", () => {
  it("fetches when libraryId is non-empty + enabled is true", async () => {
    mockApi.shares.mockResolvedValue([]);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useShares("lib-1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.shares).toHaveBeenCalledWith("lib-1");
  });

  it("does not fetch when enabled=false", () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useShares("lib-1", false), { wrapper: Wrapper });
    expect(mockApi.shares).not.toHaveBeenCalled();
  });
});

describe("useInvite / useUpdateShare / useRevokeShare", () => {
  it("invite calls librariesApi.invite with libraryId + payload", async () => {
    mockApi.invite.mockResolvedValue({ id: "s" });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInvite("lib-1"), { wrapper: Wrapper });
    result.current.mutate({ email: "a@b.test", role: "viewer" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.invite).toHaveBeenCalledWith("lib-1", {
      email: "a@b.test",
      role: "viewer",
    });
  });

  it("updateShare passes shareId + role through", async () => {
    mockApi.updateShare.mockResolvedValue({ ok: true });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateShare("lib-1"), { wrapper: Wrapper });
    result.current.mutate({ shareId: "s-1", role: "editor" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.updateShare).toHaveBeenCalledWith("lib-1", "s-1", "editor");
  });

  it("revokeShare passes shareId through", async () => {
    mockApi.revokeShare.mockResolvedValue(undefined);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevokeShare("lib-1"), { wrapper: Wrapper });
    result.current.mutate("s-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.revokeShare).toHaveBeenCalledWith("lib-1", "s-1");
  });
});

describe("useSyncLibrary", () => {
  it("calls libraryApi.sync with the libraryId", async () => {
    mockSync.mockResolvedValue({ scanned: 0, inserted: 0 });
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSyncLibrary("lib-99"), { wrapper: Wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSync).toHaveBeenCalledWith("lib-99");
  });

  it("rejects the mutation when no library is active", async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSyncLibrary(null), { wrapper: Wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/No active library/);
  });
});
