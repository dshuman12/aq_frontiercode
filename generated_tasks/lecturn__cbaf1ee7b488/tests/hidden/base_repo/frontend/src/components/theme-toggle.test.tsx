import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockSetTheme = vi.fn();
let resolved = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: resolved, setTheme: mockSetTheme }),
}));

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("renders a button labelled 'Toggle theme'", () => {
    resolved = "light";
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it("toggles to dark when current resolvedTheme is light", async () => {
    resolved = "light";
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggles to light when current resolvedTheme is dark", async () => {
    resolved = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
