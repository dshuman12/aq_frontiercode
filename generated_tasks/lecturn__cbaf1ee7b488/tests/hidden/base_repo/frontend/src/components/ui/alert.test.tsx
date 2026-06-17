import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";

describe("Alert", () => {
  it("renders children content", () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("renders the title when provided", () => {
    render(<Alert title="Heads up">Body</Alert>);
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it("uses role='alert' for error variant (assistive tech announces it)", () => {
    render(<Alert variant="error">Bad</Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("uses role='status' for non-error variants", () => {
    render(<Alert variant="success">Good</Alert>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("forwards ref to the root div", () => {
    let captured: HTMLDivElement | null = null;
    render(
      <Alert
        ref={(el) => {
          captured = el;
        }}
      >
        x
      </Alert>,
    );
    expect(captured).toBeInstanceOf(HTMLDivElement);
  });

  it("merges custom className with the base styles", () => {
    render(<Alert className="my-special-class">x</Alert>);
    const node = screen.getByRole("status");
    expect(node.className).toContain("my-special-class");
    expect(node.className).toContain("rounded-lg");
  });
});
