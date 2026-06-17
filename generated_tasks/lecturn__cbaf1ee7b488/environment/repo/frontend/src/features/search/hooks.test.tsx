import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { search: vi.fn() },
}));
vi.mock("./api", () => ({ searchApi: mockApi }));

import { useSearch } from "./hooks";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  mockApi.search.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("useSearch", () => {
  it("does not fire when the query is empty / whitespace", () => {
    renderHook(() => useSearch(""), { wrapper: makeWrapper() });
    expect(mockApi.search).not.toHaveBeenCalled();
    renderHook(() => useSearch("   "), { wrapper: makeWrapper() });
    expect(mockApi.search).not.toHaveBeenCalled();
  });

  it("fires with the trimmed query", async () => {
    mockApi.search.mockResolvedValue([]);
    const { result } = renderHook(() => useSearch("typescript"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.search).toHaveBeenCalledWith("typescript", undefined);
  });

  it("forwards a custom limit", async () => {
    mockApi.search.mockResolvedValue([]);
    const { result } = renderHook(() => useSearch("ts", 5), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.search).toHaveBeenCalledWith("ts", 5);
  });
});
