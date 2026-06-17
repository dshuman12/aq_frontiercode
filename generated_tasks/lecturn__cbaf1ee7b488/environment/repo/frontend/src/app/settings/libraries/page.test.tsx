import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../../../../test/render";
import { useActiveLibrary } from "~/stores/active-library";

// LibrariesPage embeds <LibraryShares> for owned libraries — stub it so
// the test focuses on the parent page logic.
vi.mock("./shares", () => ({
  LibraryShares: () => <div data-testid="shares" />,
}));

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    list: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    leave: vi.fn(),
    update: vi.fn(),
    shares: vi.fn(),
    invite: vi.fn(),
    updateShare: vi.fn(),
    revokeShare: vi.fn(),
  },
}));
vi.mock("~/features/libraries/api", () => ({
  librariesApi: mockApi,
  libraryApi: { sync: vi.fn() },
}));

import LibrariesSettingsPage from "./page";

beforeEach(() => {
  for (const fn of Object.values(mockApi)) fn.mockReset();
  useActiveLibrary.setState({ activeLibraryId: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const lib = (id: string, name: string, role: "owner" | "editor" | "viewer" = "owner") => ({
  id,
  name,
  sourcePath: `/${id}`,
  ownerId: "u-1",
  ownerEmail: "owner@x.test",
  ownerName: "Owner",
  role,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("LibrariesSettingsPage", () => {
  it("renders the create-library form", async () => {
    mockApi.list.mockResolvedValue([]);
    renderWithQuery(<LibrariesSettingsPage />);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/library root/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create library/i }),
    ).toBeInTheDocument();
  });

  it("submits create with the form values", async () => {
    mockApi.list.mockResolvedValue([]);
    mockApi.create.mockResolvedValue({ id: "new" });
    const user = userEvent.setup();
    renderWithQuery(<LibrariesSettingsPage />);
    await user.type(screen.getByLabelText(/^name$/i), "Side Lib");
    await user.type(screen.getByLabelText(/library root/i), "/tmp/side");
    await user.click(screen.getByRole("button", { name: /create library/i }));
    await waitFor(() =>
      expect(mockApi.create.mock.calls[0]?.[0]).toEqual({
        name: "Side Lib",
        sourcePath: "/tmp/side",
      }),
    );
  });

  it("renders an owned-library entry with a Delete button", async () => {
    mockApi.list.mockResolvedValue([lib("a", "Owned")]);
    renderWithQuery(<LibrariesSettingsPage />);
    await waitFor(() => expect(screen.getByText("Owned")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /leave/i })).toBeNull();
  });

  it("renders a shared-library entry with a Leave button (no Delete)", async () => {
    mockApi.list.mockResolvedValue([lib("a", "Shared", "viewer")]);
    renderWithQuery(<LibrariesSettingsPage />);
    await waitFor(() => expect(screen.getByText("Shared")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /leave/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("calls librariesApi.remove when Delete is clicked + confirmed", async () => {
    mockApi.list.mockResolvedValue([lib("a", "Owned")]);
    mockApi.remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithQuery(<LibrariesSettingsPage />);
    await waitFor(() => expect(screen.getByText("Owned")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() =>
      expect(mockApi.remove.mock.calls[0]?.[0]).toBe("a"),
    );
  });

  it("calls librariesApi.leave on a shared library when Leave is clicked", async () => {
    mockApi.list.mockResolvedValue([lib("a", "Shared", "editor")]);
    mockApi.leave.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderWithQuery(<LibrariesSettingsPage />);
    await waitFor(() => expect(screen.getByText("Shared")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /leave/i }));
    await waitFor(() =>
      expect(mockApi.leave.mock.calls[0]?.[0]).toBe("a"),
    );
  });
});
