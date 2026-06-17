import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));
vi.mock("./api", () => ({ watchLaterApi: mockApi }));

import {
  useAddToQueue,
  useQueue,
  useRemoveFromQueue,
  useReorderQueue,
} from "./hooks";

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
  for (const fn of Object.values(mockApi)) fn.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("watch-later hooks", () => {
  it("useQueue calls watchLaterApi.get", async () => {
    mockApi.get.mockResolvedValue({ queued: [], continueWatching: [] });
    const { result } = renderHook(() => useQueue(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.get).toHaveBeenCalled();
  });

  it("useAddToQueue forwards the episodeId", async () => {
    mockApi.add.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAddToQueue(), { wrapper: makeWrapper() });
    result.current.mutate("ep-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.add.mock.calls[0]?.[0]).toBe("ep-1");
  });

  it("useRemoveFromQueue forwards the episodeId", async () => {
    mockApi.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveFromQueue(), { wrapper: makeWrapper() });
    result.current.mutate("ep-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.remove.mock.calls[0]?.[0]).toBe("ep-1");
  });

  it("useReorderQueue passes the ordered array", async () => {
    mockApi.reorder.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useReorderQueue(), { wrapper: makeWrapper() });
    result.current.mutate(["a", "b", "c"]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.reorder.mock.calls[0]?.[0]).toEqual(["a", "b", "c"]);
  });
});
