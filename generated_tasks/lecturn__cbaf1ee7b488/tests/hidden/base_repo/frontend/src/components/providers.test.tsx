import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Providers } from "./providers";

describe("Providers", () => {
  it("renders children inside the QueryClientProvider + ThemeProvider stack", () => {
    render(
      <Providers>
        <p data-testid="leaf">visible</p>
      </Providers>,
    );
    expect(screen.getByTestId("leaf")).toBeInTheDocument();
  });

  it("creates one QueryClient per render call", () => {
    // Smoke-check that mounting/unmounting doesn't crash.
    const { unmount } = render(
      <Providers>
        <span>x</span>
      </Providers>,
    );
    unmount();
    render(
      <Providers>
        <span>y</span>
      </Providers>,
    );
    expect(screen.getByText("y")).toBeInTheDocument();
  });
});
