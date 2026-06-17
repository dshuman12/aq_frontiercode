import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("./api", () => ({ bookmarksApi: mockApi }));

import {
  useBookmarks,
  useCreateBookmark,
  useDeleteBookmark,
  useUpdateBookmark,
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

describe("useBookmarks", () => {
  it("fires only when episodeId is non-null", () => {
    renderHook(() => useBookmarks(null), { wrapper: makeWrapper() });
    expect(mockApi.list).not.toHaveBeenCalled();
  });

  it("calls bookmarksApi.list with the episodeId", async () => {
    mockApi.list.mockResolvedValue([]);
    const { result } = renderHook(() => useBookmarks("ep-1"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.list).toHaveBeenCalledWith("ep-1");
  });
});

describe("useCreateBookmark", () => {
  it("creates and forwards body", async () => {
    mockApi.create.mockResolvedValue({ id: "b" });
    const { result } = renderHook(() => useCreateBookmark("ep-1"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ atSec: 12, label: "x" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.create).toHaveBeenCalledWith("ep-1", { atSec: 12, label: "x" });
  });
});

describe("useUpdateBookmark", () => {
  it("forwards bookmarkId + patch", async () => {
    mockApi.update.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useUpdateBookmark("ep-1"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ bookmarkId: "b-1", label: "renamed", atSec: 99 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.update).toHaveBeenCalledWith("b-1", {
      label: "renamed",
      atSec: 99,
    });
  });
});

describe("useDeleteBookmark", () => {
  it("forwards the bookmarkId", async () => {
    mockApi.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteBookmark("ep-1"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("b-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.remove.mock.calls[0]?.[0]).toBe("b-1");
  });
});
