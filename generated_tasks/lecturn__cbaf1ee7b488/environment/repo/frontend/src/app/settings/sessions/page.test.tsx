import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListSessions = vi.fn();
const mockRevokeSession = vi.fn();
const mockRevokeOther = vi.fn();
let currentToken = "tok-current";

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    listSessions: (...a: unknown[]) => mockListSessions(...a),
    revokeSession: (...a: unknown[]) => mockRevokeSession(...a),
    revokeOtherSessions: (...a: unknown[]) => mockRevokeOther(...a),
  },
  useSession: () => ({ data: { session: { token: currentToken } } }),
}));

import SessionsPage from "./page";
import { renderWithQuery } from "../../../../test/render";

beforeEach(() => {
  mockListSessions.mockReset();
  mockRevokeSession.mockReset();
  mockRevokeOther.mockReset();
  currentToken = "tok-current";
});

afterEach(() => {
  vi.clearAllMocks();
});

const sessions = [
  {
    id: "s1",
    token: "tok-current",
    userAgent: "Brave/1.0",
    ipAddress: "127.0.0.1",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
  },
  {
    id: "s2",
    token: "tok-other",
    userAgent: "Safari/iOS",
    ipAddress: "10.0.0.5",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
  },
];

describe("SessionsPage", () => {
  it("renders one card per session, badging the current device", async () => {
    mockListSessions.mockResolvedValue({ data: sessions });
    renderWithQuery(<SessionsPage />);
    await waitFor(() => expect(screen.getByText("Brave/1.0")).toBeInTheDocument());
    expect(screen.getByText("Safari/iOS")).toBeInTheDocument();
    expect(screen.getByText(/this device/i)).toBeInTheDocument();
  });

  it("hides the Revoke button on the current device card", async () => {
    mockListSessions.mockResolvedValue({ data: sessions });
    renderWithQuery(<SessionsPage />);
    await waitFor(() => expect(screen.getByText("Brave/1.0")).toBeInTheDocument());
    const revokeBtns = screen.getAllByRole("button", { name: /^revoke$/i });
    expect(revokeBtns).toHaveLength(1); // only the non-current session has one
  });

  it("calls revokeSession with the token when Revoke is clicked", async () => {
    mockListSessions.mockResolvedValue({ data: sessions });
    mockRevokeSession.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderWithQuery(<SessionsPage />);
    await waitFor(() => expect(screen.getByText("Safari/iOS")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^revoke$/i }));
    expect(mockRevokeSession).toHaveBeenCalledWith({ token: "tok-other" });
  });

  it("'Sign out other devices' is enabled when more than one session exists", async () => {
    mockListSessions.mockResolvedValue({ data: sessions });
    renderWithQuery(<SessionsPage />);
    await waitFor(() => expect(screen.getByText("Brave/1.0")).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: /sign out other devices/i }),
    ).not.toBeDisabled();
  });

  it("calls revokeOtherSessions when 'Sign out other devices' is clicked", async () => {
    mockListSessions.mockResolvedValue({ data: sessions });
    mockRevokeOther.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderWithQuery(<SessionsPage />);
    await waitFor(() => expect(screen.getByText("Brave/1.0")).toBeInTheDocument());
    await user.click(
      screen.getByRole("button", { name: /sign out other devices/i }),
    );
    expect(mockRevokeOther).toHaveBeenCalled();
  });
});
