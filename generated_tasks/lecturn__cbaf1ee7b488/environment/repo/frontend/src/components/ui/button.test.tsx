import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders the children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button onClick={handler}>Tap</Button>);
    await user.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <Button onClick={handler} disabled>
        x
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("applies the accent variant classes", () => {
    render(<Button variant="accent">x</Button>);
    expect(screen.getByRole("button").className).toContain("bg-[var(--color-amber-accent)]");
  });

  it("applies size 'icon' (square dimensions)", () => {
    render(<Button size="icon" aria-label="i" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("size-10");
  });

  it("renders with asChild via Slot when asChild=true", () => {
    render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/x");
    expect(link.className).toContain("rounded-lg");
  });

  it("buttonVariants is callable and returns a class string", () => {
    const cls = buttonVariants({ variant: "outline", size: "sm" });
    expect(typeof cls).toBe("string");
    expect(cls).toContain("border");
    expect(cls).toContain("h-8");
  });
});
