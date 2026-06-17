import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("starts with type='password' (hidden by default)", () => {
    render(<PasswordInput data-testid="i" defaultValue="secret" />);
    expect(screen.getByTestId("i")).toHaveAttribute("type", "password");
  });

  it("toggles to type='text' when the eye button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput data-testid="i" defaultValue="secret" />);
    const toggle = screen.getByRole("button", { name: /show password/i });
    await user.click(toggle);
    expect(screen.getByTestId("i")).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: /hide password/i }),
    ).toBeInTheDocument();
  });

  it("toggles back when clicked twice", async () => {
    const user = userEvent.setup();
    render(<PasswordInput data-testid="i" />);
    const toggle = screen.getByRole("button", { name: /show password/i });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(screen.getByTestId("i")).toHaveAttribute("type", "password");
  });

  it("eye toggle has tabIndex=-1 so it doesn't break tab order", () => {
    render(<PasswordInput data-testid="i" />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "-1");
  });

  it("forwards ref to the input element", () => {
    let captured: HTMLInputElement | null = null;
    render(
      <PasswordInput
        ref={(el) => {
          captured = el;
        }}
        data-testid="i"
      />,
    );
    expect(captured).toBeInstanceOf(HTMLInputElement);
  });

  it("respects placeholder + autoComplete props", () => {
    render(<PasswordInput placeholder="Pwd" autoComplete="new-password" />);
    const el = screen.getByPlaceholderText("Pwd");
    expect(el).toHaveAttribute("autocomplete", "new-password");
  });
});
