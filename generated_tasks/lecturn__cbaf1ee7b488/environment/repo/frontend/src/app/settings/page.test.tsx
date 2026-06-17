import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { email: "ada@x.test" } } }),
}));

import SettingsOverviewPage from "./page";

describe("SettingsOverviewPage", () => {
  it("renders the four section cards as links", () => {
    render(<SettingsOverviewPage />);
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Libraries")).toBeInTheDocument();
    expect(screen.getByText("Connection")).toBeInTheDocument();
  });

  it("links each card to its detail tab", () => {
    render(<SettingsOverviewPage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href")).filter(Boolean);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/settings/account",
        "/settings/sessions",
        "/settings/libraries",
        "/settings/connection",
      ]),
    );
  });

  it("shows the signed-in email in the header", () => {
    render(<SettingsOverviewPage />);
    expect(screen.getByText("ada@x.test")).toBeInTheDocument();
  });
});
