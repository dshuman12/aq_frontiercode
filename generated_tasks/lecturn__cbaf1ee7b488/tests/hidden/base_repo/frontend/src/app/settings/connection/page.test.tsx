import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ApiStatus uses react-query — replace with a stub so we don't need to set
// up a QueryClientProvider for this rendering smoke test.
vi.mock("./api-status", () => ({
  ApiStatus: () => <div data-testid="api-status">api-status</div>,
}));

import ConnectionPage from "./page";

describe("ConnectionPage", () => {
  it("renders the API endpoint card and the ApiStatus widget", () => {
    render(<ConnectionPage />);
    expect(screen.getAllByText(/api endpoint/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("api-status")).toBeInTheDocument();
  });

  it("displays the configured NEXT_PUBLIC_API_URL", () => {
    render(<ConnectionPage />);
    // setup.ts pins this to http://localhost:4000
    expect(screen.getByText(/localhost:4000/)).toBeInTheDocument();
  });
});
