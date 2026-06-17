import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../../../test/render";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { search: vi.fn() },
}));
vi.mock("./api", () => ({ searchApi: mockApi }));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { SearchPalette } from "./SearchPalette";

beforeEach(() => {
  mockApi.search.mockReset();
  mockPush.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("SearchPalette", () => {
  it("does not render when open=false", () => {
    renderWithQuery(<SearchPalette open={false} onOpenChange={() => {}} />);
    expect(screen.queryByPlaceholderText(/search courses/i)).toBeNull();
  });

  it("renders the input when open=true", () => {
    renderWithQuery(<SearchPalette open onOpenChange={() => {}} />);
    expect(
      screen.getByPlaceholderText(/search courses/i),
    ).toBeInTheDocument();
  });

  it("debounces the query and fires search after typing", async () => {
    mockApi.search.mockResolvedValue([
      { type: "course", id: "c-1", libraryId: "l-1", title: "TypeScript", description: null, rank: 0.5 },
    ]);
    const user = userEvent.setup();
    renderWithQuery(<SearchPalette open onOpenChange={() => {}} />);
    await user.type(screen.getByPlaceholderText(/search courses/i), "type");
    await waitFor(
      () => expect(mockApi.search).toHaveBeenCalled(),
      { timeout: 1000 },
    );
    await waitFor(() => expect(screen.getByText("TypeScript")).toBeInTheDocument());
  });

  it("navigates to the course page when a course hit is clicked", async () => {
    mockApi.search.mockResolvedValue([
      { type: "course", id: "c-99", libraryId: "l", title: "Advanced", description: null, rank: 1 },
    ]);
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithQuery(<SearchPalette open onOpenChange={onOpenChange} />);
    await user.type(screen.getByPlaceholderText(/search courses/i), "advanced");
    await waitFor(() => expect(screen.getByText("Advanced")).toBeInTheDocument());
    await user.click(screen.getByText("Advanced"));
    expect(mockPush).toHaveBeenCalledWith("/courses/c-99");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders 'no matches' for queries with zero results", async () => {
    mockApi.search.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithQuery(<SearchPalette open onOpenChange={() => {}} />);
    await user.type(screen.getByPlaceholderText(/search courses/i), "ghost");
    await waitFor(() =>
      expect(screen.getByText(/No matches/)).toBeInTheDocument(),
    );
  });
});
