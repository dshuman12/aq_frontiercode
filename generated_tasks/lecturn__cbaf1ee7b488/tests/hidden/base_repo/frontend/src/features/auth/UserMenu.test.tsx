import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignOut = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let session: { user?: { name: string; email: string; image: string | null } } | null = null;
let pending = false;

vi.mock("~/lib/auth-client", () => ({
  signOut: () => mockSignOut(),
  useSession: () => ({ data: session, isPending: pending }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

import { UserMenu } from "./UserMenu";

beforeEach(() => {
  mockSignOut.mockReset();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  session = null;
  pending = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("UserMenu", () => {
  it("renders nothing while the session is loading", () => {
    pending = true;
    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a 'Sign in' link when there's no session", () => {
    pending = false;
    session = null;
    render(<UserMenu />);
    expect(
      screen.getByRole("link", { name: /sign in/i }),
    ).toHaveAttribute("href", "/sign-in");
  });

  it("renders the avatar with initials when the user has no image", () => {
    session = { user: { name: "Ada Lovelace", email: "ada@x.test", image: null } };
    render(<UserMenu />);
    const trigger = screen.getByRole("button", { name: /account/i });
    expect(trigger.textContent).toContain("AL");
  });

  it("opens the menu and shows email + tabs when clicked", async () => {
    session = { user: { name: "Ada", email: "ada@x.test", image: null } };
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole("button", { name: /account/i }));
    expect(screen.getByText("ada@x.test")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });

  it("signs out and routes to /sign-in on the Sign out item", async () => {
    session = { user: { name: "Ada", email: "ada@x.test", image: null } };
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole("button", { name: /account/i }));
    await user.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(mockSignOut).toHaveBeenCalled();
    // replace + refresh fire after sign-out resolves
    expect(mockReplace).toHaveBeenCalledWith("/sign-in");
  });
});
