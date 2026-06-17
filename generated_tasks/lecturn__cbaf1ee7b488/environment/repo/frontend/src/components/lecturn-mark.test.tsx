import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LecturnMark } from "./lecturn-mark";

describe("LecturnMark", () => {
  it("renders an SVG element", () => {
    const { container } = render(<LecturnMark />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  });

  it("uses currentColor on the L stem and base (so it adapts to text color)", () => {
    const { container } = render(<LecturnMark />);
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThanOrEqual(2);
    rects.forEach((r) => {
      expect(r.getAttribute("fill")).toBe("currentColor");
    });
  });

  it("uses --color-amber-accent on the play triangle", () => {
    const { container } = render(<LecturnMark />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("fill")).toBe("var(--color-amber-accent)");
  });

  it("merges a className override onto the svg", () => {
    const { container } = render(<LecturnMark className="size-10" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("size-10");
  });

  it("is hidden from assistive tech (aria-hidden)", () => {
    const { container } = render(<LecturnMark />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
