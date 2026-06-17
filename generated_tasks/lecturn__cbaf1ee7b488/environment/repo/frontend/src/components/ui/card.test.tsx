import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardBody, CardMeta, CardTitle } from "./card";

describe("Card primitives", () => {
  it("Card renders children", () => {
    render(
      <Card data-testid="c">
        <span>inside</span>
      </Card>,
    );
    expect(screen.getByTestId("c")).toBeInTheDocument();
    expect(screen.getByText("inside")).toBeInTheDocument();
  });

  it("CardBody applies padding", () => {
    render(<CardBody data-testid="b">x</CardBody>);
    expect(screen.getByTestId("b").className).toContain("p-5");
  });

  it("CardTitle renders an h3 with display font", () => {
    render(<CardTitle>Hello</CardTitle>);
    const h = screen.getByRole("heading", { level: 3 });
    expect(h).toHaveTextContent("Hello");
    expect(h.className).toContain("font-semibold");
  });

  it("CardMeta renders a paragraph in muted text", () => {
    render(<CardMeta>meta</CardMeta>);
    const p = screen.getByText("meta");
    expect(p.tagName).toBe("P");
    expect(p.className).toContain("text-[var(--muted-foreground)]");
  });

  it("primitives merge custom className with defaults", () => {
    render(<Card className="zzz" data-testid="c" />);
    const c = screen.getByTestId("c");
    expect(c.className).toContain("zzz");
    expect(c.className).toContain("rounded-[var(--radius-card)]");
  });
});
