import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./theme-toggle", () => ({ ThemeToggle: () => <button>theme</button> }));
vi.mock("~/features/auth/UserMenu", () => ({ UserMenu: () => <span>user</span> }));
vi.mock("~/features/courses/components/SyncButton", () => ({
  SyncButton: () => <button>sync</button>,
}));
vi.mock("~/features/libraries/LibrarySwitcher", () => ({
  LibrarySwitcher: () => <button>lib-switch</button>,
}));
vi.mock("~/features/search/SearchTrigger", () => ({
  SearchTrigger: () => <button>search</button>,
}));

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("renders the wordmark and routes home", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Lecturn")).toBeInTheDocument();
    const home = screen.getByRole("link");
    expect(home).toHaveAttribute("href", "/");
  });

  it("includes the brand mark, switcher, sync, theme, and user menu", () => {
    render(<SiteHeader />);
    expect(screen.getByText("lib-switch")).toBeInTheDocument();
    expect(screen.getByText("sync")).toBeInTheDocument();
    expect(screen.getByText("theme")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
  });
});
