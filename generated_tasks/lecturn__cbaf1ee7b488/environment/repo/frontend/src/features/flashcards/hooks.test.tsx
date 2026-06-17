import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    list: vi.fn(),
    due: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    review: vi.fn(),
  },
}));
vi.mock("./api", () => ({ flashcardsApi: mockApi }));

import {
  useCreateFlashcard,
  useDeleteFlashcard,
  useDueFlashcards,
  useFlashcards,
  useReviewFlashcard,
  useUpdateFlashcard,
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

describe("flashcards hooks", () => {
  it("useFlashcards calls list with the filter", async () => {
    mockApi.list.mockResolvedValue([]);
    const { result } = renderHook(() => useFlashcards({ episodeId: "ep" }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.list).toHaveBeenCalledWith({ episodeId: "ep" });
  });

  it("useDueFlashcards calls due with optional limit", async () => {
    mockApi.due.mockResolvedValue([]);
    const { result } = renderHook(() => useDueFlashcards(25), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.due).toHaveBeenCalledWith(25);
  });

  it("useCreateFlashcard forwards body", async () => {
    mockApi.create.mockResolvedValue({ id: "c" });
    const { result } = renderHook(() => useCreateFlashcard(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ front: "q", back: "a" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.create.mock.calls[0]?.[0]).toMatchObject({
      front: "q",
      back: "a",
    });
  });

  it("useUpdateFlashcard splits cardId out of patch", async () => {
    mockApi.update.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useUpdateFlashcard(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ cardId: "c", front: "new-q" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.update).toHaveBeenCalledWith("c", { front: "new-q" });
  });

  it("useDeleteFlashcard forwards the cardId", async () => {
    mockApi.remove.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteFlashcard(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate("c");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.remove.mock.calls[0]?.[0]).toBe("c");
  });

  it("useReviewFlashcard forwards cardId + rating", async () => {
    mockApi.review.mockResolvedValue({
      state: "review",
      dueAt: new Date().toISOString(),
      scheduledDays: 3,
    });
    const { result } = renderHook(() => useReviewFlashcard(), {
      wrapper: makeWrapper(),
    });
    result.current.mutate({ cardId: "c", rating: 3 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.review).toHaveBeenCalledWith("c", 3);
  });
});
