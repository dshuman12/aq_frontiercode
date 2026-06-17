import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));
vi.mock("./site-header", () => ({
  SiteHeader: () => <div data-testid="site-header">HEADER</div>,
}));

import { SiteChrome } from "./site-chrome";

afterEach(() => {
  mockPathname.mockReset();
});

describe("SiteChrome", () => {
  it("renders the SiteHeader + main wrapper on a normal app route", () => {
    mockPathname.mockReturnValue("/");
    render(
      <SiteChrome>
        <p>body</p>
      </SiteChrome>,
    );
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("hides the chrome on /sign-in", () => {
    mockPathname.mockReturnValue("/sign-in");
    render(
      <SiteChrome>
        <p>only-this</p>
      </SiteChrome>,
    );
    expect(screen.queryByTestId("site-header")).toBeNull();
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByText("only-this")).toBeInTheDocument();
  });

  it("hides on /sign-up and /magic-link too", () => {
    mockPathname.mockReturnValue("/sign-up");
    const { rerender } = render(
      <SiteChrome>
        <p>x</p>
      </SiteChrome>,
    );
    expect(screen.queryByTestId("site-header")).toBeNull();

    mockPathname.mockReturnValue("/magic-link/verify");
    rerender(
      <SiteChrome>
        <p>x</p>
      </SiteChrome>,
    );
    expect(screen.queryByTestId("site-header")).toBeNull();
  });
});
