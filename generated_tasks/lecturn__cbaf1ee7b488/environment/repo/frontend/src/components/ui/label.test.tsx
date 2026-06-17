import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "./label";

describe("Label", () => {
  it("renders the children text", () => {
    render(<Label>Email</Label>);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("forwards htmlFor", () => {
    render(<Label htmlFor="x">Name</Label>);
    expect(screen.getByText("Name")).toHaveAttribute("for", "x");
  });

  it("merges custom className", () => {
    render(<Label className="my">x</Label>);
    expect(screen.getByText("x").className).toContain("my");
  });
});
