import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../../../test/render";

const { mockApi } = vi.hoisted(() => ({
  mockApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock("./api", () => ({ bookmarksApi: mockApi }));

import { BookmarksPanel } from "./BookmarksPanel";

beforeEach(() => {
  for (const fn of Object.values(mockApi)) fn.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("BookmarksPanel", () => {
  it("renders the empty-state message when no bookmarks exist", async () => {
    mockApi.list.mockResolvedValue([]);
    renderWithQuery(
      <BookmarksPanel episodeId="ep-1" currentTime={0} />,
    );
    await waitFor(() =>
      expect(screen.getByText(/No bookmarks yet/)).toBeInTheDocument(),
    );
  });

  it("renders the bookmarks list with formatted timestamps", async () => {
    mockApi.list.mockResolvedValue([
      { id: "b1", episodeId: "ep-1", atSec: 65, label: "First", createdAt: "" },
      { id: "b2", episodeId: "ep-1", atSec: 0, label: null, createdAt: "" },
    ]);
    renderWithQuery(
      <BookmarksPanel episodeId="ep-1" currentTime={0} />,
    );
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());
    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("submits a new bookmark at the current playhead", async () => {
    mockApi.list.mockResolvedValue([]);
    mockApi.create.mockResolvedValue({ id: "new" });
    const user = userEvent.setup();
    renderWithQuery(
      <BookmarksPanel episodeId="ep-1" currentTime={42} />,
    );
    const input = await screen.findByLabelText(/bookmark label/i);
    await user.type(input, "key insight");
    await user.click(screen.getByRole("button", { name: /add bookmark/i }));
    await waitFor(() =>
      expect(mockApi.create).toHaveBeenCalledWith("ep-1", {
        atSec: 42,
        label: "key insight",
      }),
    );
  });

  it("calls onSeek when an existing bookmark is clicked", async () => {
    mockApi.list.mockResolvedValue([
      { id: "b1", episodeId: "ep-1", atSec: 30, label: "Foo", createdAt: "" },
    ]);
    const onSeek = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(
      <BookmarksPanel episodeId="ep-1" currentTime={0} onSeek={onSeek} />,
    );
    await waitFor(() => expect(screen.getByText("Foo")).toBeInTheDocument());
    await user.click(screen.getByText("Foo"));
    expect(onSeek).toHaveBeenCalledWith(30);
  });
});
