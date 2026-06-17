import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });

  it("forwards type prop to the underlying input", () => {
    render(<Input type="email" data-testid="i" />);
    expect(screen.getByTestId("i")).toHaveAttribute("type", "email");
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input data-testid="i" />);
    const el = screen.getByTestId("i") as HTMLInputElement;
    await user.type(el, "hello");
    expect(el.value).toBe("hello");
  });

  it("forwards ref to the input element", () => {
    let captured: HTMLInputElement | null = null;
    render(
      <Input
        ref={(el) => {
          captured = el;
        }}
        data-testid="i"
      />,
    );
    expect(captured).toBeInstanceOf(HTMLInputElement);
  });

  it("applies disabled styling when disabled", () => {
    render(<Input disabled data-testid="i" />);
    const el = screen.getByTestId("i");
    expect(el).toBeDisabled();
    expect(el.className).toContain("disabled:opacity-50");
  });

  it("merges custom className", () => {
    render(<Input className="custom-x" data-testid="i" />);
    expect(screen.getByTestId("i").className).toContain("custom-x");
  });
});
