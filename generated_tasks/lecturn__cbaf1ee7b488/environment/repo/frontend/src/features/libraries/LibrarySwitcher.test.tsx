import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../../../test/render";
import { useActiveLibrary } from "~/stores/active-library";

const mockList = vi.fn();
vi.mock("./api", () => ({
  librariesApi: { list: () => mockList() },
  libraryApi: { sync: vi.fn() },
}));

import { LibrarySwitcher } from "./LibrarySwitcher";

beforeEach(() => {
  mockList.mockReset();
  useActiveLibrary.setState({ activeLibraryId: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

const lib = (id: string, name: string, role: "owner" | "editor" | "viewer" = "owner") => ({
  id,
  name,
  sourcePath: `/${id}`,
  ownerId: "u-1",
  ownerEmail: "o@x.test",
  ownerName: "Owner",
  role,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("LibrarySwitcher", () => {
  it("renders nothing while loading", () => {
    mockList.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithQuery(<LibrarySwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("auto-selects the first library when no active id is set", async () => {
    mockList.mockResolvedValue([lib("lib-1", "Mine"), lib("lib-2", "Other")]);
    renderWithQuery(<LibrarySwitcher />);
    await waitFor(() =>
      expect(useActiveLibrary.getState().activeLibraryId).toBe("lib-1"),
    );
    expect(screen.getByRole("button")).toHaveTextContent("Mine");
  });

  it("opens the dropdown and lists every library option", async () => {
    mockList.mockResolvedValue([lib("a", "Alpha"), lib("b", "Bravo")]);
    const user = userEvent.setup();
    renderWithQuery(<LibrarySwitcher />);
    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Bravo")).toBeInTheDocument();
  });

  it("switches the active library when a different option is selected", async () => {
    mockList.mockResolvedValue([lib("a", "Alpha"), lib("b", "Bravo")]);
    const user = userEvent.setup();
    renderWithQuery(<LibrarySwitcher />);
    await waitFor(() => expect(useActiveLibrary.getState().activeLibraryId).toBe("a"));
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Bravo"));
    await waitFor(() =>
      expect(useActiveLibrary.getState().activeLibraryId).toBe("b"),
    );
  });

  it("shows 'Shared by X' for libraries the caller doesn't own", async () => {
    mockList.mockResolvedValue([
      { ...lib("a", "Mine"), role: "owner" as const },
      { ...lib("b", "Theirs", "viewer"), ownerName: "Bob" },
    ]);
    const user = userEvent.setup();
    renderWithQuery(<LibrarySwitcher />);
    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
    await user.click(screen.getByRole("button"));
    expect(screen.getByText(/shared by bob/i)).toBeInTheDocument();
  });
});
