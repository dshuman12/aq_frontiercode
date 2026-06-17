import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockNotes, mockHighlights } = vi.hoisted(() => ({
  mockNotes: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  mockHighlights: { list: vi.fn(), create: vi.fn(), remove: vi.fn() },
}));
vi.mock("./api", () => ({
  notesApi: mockNotes,
  highlightsApi: mockHighlights,
}));

import {
  useCreateHighlight,
  useCreateNote,
  useDeleteHighlight,
  useDeleteNote,
  useHighlights,
  useNotes,
  useUpdateNote,
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
  for (const fn of Object.values(mockNotes)) fn.mockReset();
  for (const fn of Object.values(mockHighlights)) fn.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("notes hooks", () => {
  it("useNotes is gated by episodeId presence", () => {
    renderHook(() => useNotes(null), { wrapper: makeWrapper() });
    expect(mockNotes.list).not.toHaveBeenCalled();
  });

  it("useNotes calls list with the episodeId", async () => {
    mockNotes.list.mockResolvedValue([]);
    const { result } = renderHook(() => useNotes("ep"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockNotes.list).toHaveBeenCalledWith("ep");
  });

  it("useCreateNote forwards episodeId + body", async () => {
    mockNotes.create.mockResolvedValue({ id: "n" });
    const { result } = renderHook(() => useCreateNote("ep"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ body: "hello", atSec: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockNotes.create).toHaveBeenCalledWith("ep", { body: "hello", atSec: 1 });
  });

  it("useUpdateNote splits noteId out of patch", async () => {
    mockNotes.update.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useUpdateNote("ep"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ noteId: "n", body: "new" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockNotes.update).toHaveBeenCalledWith("n", { body: "new" });
  });

  it("useDeleteNote forwards the noteId", async () => {
    mockNotes.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteNote("ep"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("n");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockNotes.remove.mock.calls[0]?.[0]).toBe("n");
  });
});

describe("highlights hooks", () => {
  it("useHighlights gates on episodeId", () => {
    renderHook(() => useHighlights(null), { wrapper: makeWrapper() });
    expect(mockHighlights.list).not.toHaveBeenCalled();
  });

  it("useCreateHighlight forwards episodeId + body", async () => {
    mockHighlights.create.mockResolvedValue({ id: "h" });
    const { result } = renderHook(() => useCreateHighlight("ep"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ startSec: 0, endSec: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockHighlights.create).toHaveBeenCalledWith("ep", {
      startSec: 0,
      endSec: 5,
    });
  });

  it("useDeleteHighlight forwards the highlightId", async () => {
    mockHighlights.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteHighlight("ep"), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("h-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockHighlights.remove.mock.calls[0]?.[0]).toBe("h-1");
  });
});
