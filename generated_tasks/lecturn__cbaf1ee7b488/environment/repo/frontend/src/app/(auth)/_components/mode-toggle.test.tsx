import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModeToggle } from "./mode-toggle";

const options = [
  { value: "a" as const, label: "Alpha" },
  { value: "b" as const, label: "Beta" },
  { value: "c" as const, label: "Gamma" },
];

describe("ModeToggle", () => {
  it("renders each option as a radio button", () => {
    render(<ModeToggle value="a" onChange={() => {}} options={options} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the active option as aria-checked=true", () => {
    render(<ModeToggle value="b" onChange={() => {}} options={options} />);
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onChange with the new value when an option is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeToggle value="a" onChange={onChange} options={options} />);
    await user.click(screen.getByRole("radio", { name: "Gamma" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("uses role='radiogroup' on the container with label as aria-label", () => {
    render(
      <ModeToggle label="Mode" value="a" onChange={() => {}} options={options} />,
    );
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-label", "Mode");
  });
});
