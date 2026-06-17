import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../../../test/render";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { due: vi.fn(), review: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock("./api", () => ({ flashcardsApi: mockApi }));

import { FlashcardReview } from "./FlashcardReview";

const card = (over: Partial<{ id: string; front: string; back: string }> = {}) => ({
  id: over.id ?? "c-1",
  front: over.front ?? "What is closure?",
  back: over.back ?? "A function plus its captured scope.",
  state: "new" as const,
  stability: 0,
  difficulty: 0,
  reps: 0,
  lapses: 0,
  dueAt: new Date().toISOString(),
  lastReviewedAt: null,
  episodeId: null,
  courseId: null,
  sourceNoteId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

beforeEach(() => {
  for (const fn of Object.values(mockApi)) fn.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("FlashcardReview", () => {
  it("shows the all-caught-up state when no cards are due", async () => {
    mockApi.due.mockResolvedValue([]);
    renderWithQuery(<FlashcardReview />);
    await waitFor(() =>
      expect(screen.getByText(/All caught up/i)).toBeInTheDocument(),
    );
  });

  it("renders the front of the first card and a 'Reveal answer' button", async () => {
    mockApi.due.mockResolvedValue([card()]);
    renderWithQuery(<FlashcardReview />);
    await waitFor(() =>
      expect(screen.getByText("What is closure?")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /reveal answer/i }),
    ).toBeInTheDocument();
  });

  it("reveals the back of the card when 'Reveal answer' is clicked", async () => {
    mockApi.due.mockResolvedValue([card()]);
    const user = userEvent.setup();
    renderWithQuery(<FlashcardReview />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reveal answer/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /reveal answer/i }));
    expect(
      screen.getByText("A function plus its captured scope."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good/i })).toBeInTheDocument();
  });

  it("calls flashcardsApi.review on rating click", async () => {
    mockApi.due.mockResolvedValue([card({ id: "c-7" })]);
    mockApi.review.mockResolvedValue({
      state: "review",
      dueAt: new Date(Date.now() + 86400_000).toISOString(),
      scheduledDays: 1,
    });
    const user = userEvent.setup();
    renderWithQuery(<FlashcardReview />);
    await waitFor(() =>
      expect(screen.getByText("What is closure?")).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /reveal answer/i }));
    await user.click(screen.getByRole("button", { name: /good/i }));
    await waitFor(() =>
      expect(mockApi.review).toHaveBeenCalledWith("c-7", 3),
    );
  });

  it("shows progress (e.g. '1 of 2') when the queue has multiple cards", async () => {
    mockApi.due.mockResolvedValue([card({ id: "a" }), card({ id: "b" })]);
    renderWithQuery(<FlashcardReview />);
    await waitFor(() => expect(screen.getByText(/1 of 2/)).toBeInTheDocument());
  });
});
