import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateUser = vi.fn();
const mockChangePassword = vi.fn();
const mockRefetch = vi.fn();
let session: { user: { name: string; email: string } } | null = null;

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    updateUser: (...a: unknown[]) => mockUpdateUser(...a),
    changePassword: (...a: unknown[]) => mockChangePassword(...a),
  },
  useSession: () => ({ data: session, refetch: mockRefetch }),
}));

import AccountSettingsPage from "./page";
import { renderWithQuery } from "../../../../test/render";

beforeEach(() => {
  mockUpdateUser.mockReset();
  mockChangePassword.mockReset();
  mockRefetch.mockReset();
  session = { user: { name: "Ada", email: "ada@x.test" } };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AccountSettingsPage", () => {
  it("renders the email (disabled) and name inputs prefilled from session", async () => {
    renderWithQuery(<AccountSettingsPage />);
    await waitFor(() =>
      expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe("Ada"),
    );
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe(
      "ada@x.test",
    );
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
  });

  it("submits authClient.updateUser when the profile form is saved", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderWithQuery(<AccountSettingsPage />);
    const name = await screen.findByLabelText(/^name$/i);
    await user.clear(name);
    await user.type(name, "Renamed");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() =>
      expect(mockUpdateUser).toHaveBeenCalledWith({ name: "Renamed" }),
    );
  });

  it("renders the change-password form with current/new fields", () => {
    renderWithQuery(<AccountSettingsPage />);
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i }),
    ).toBeInTheDocument();
  });

  it("submits authClient.changePassword with revokeOtherSessions=true", async () => {
    mockChangePassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderWithQuery(<AccountSettingsPage />);
    await user.type(screen.getByLabelText(/current password/i), "old-pass-12345");
    await user.type(screen.getByLabelText(/new password/i), "new-pass-12345");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() =>
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: "old-pass-12345",
        newPassword: "new-pass-12345",
        revokeOtherSessions: true,
      }),
    );
  });

  it("surfaces an error message when changePassword returns an error", async () => {
    mockChangePassword.mockResolvedValue({ error: { message: "wrong password" } });
    const user = userEvent.setup();
    renderWithQuery(<AccountSettingsPage />);
    await user.type(screen.getByLabelText(/current password/i), "bad");
    await user.type(screen.getByLabelText(/new password/i), "new-pass-12345");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => expect(screen.getByText(/wrong password/i)).toBeInTheDocument());
  });
});
