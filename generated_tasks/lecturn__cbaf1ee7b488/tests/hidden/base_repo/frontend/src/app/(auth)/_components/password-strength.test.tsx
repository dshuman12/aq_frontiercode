import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordStrength, scorePassword } from "./password-strength";

describe("scorePassword", () => {
  it("returns 0 with empty label for empty input", () => {
    const s = scorePassword("");
    expect(s.value).toBe(0);
    expect(s.label).toBe("");
  });

  it("returns 'Too short' below 8 chars", () => {
    expect(scorePassword("abc").label).toBe("Too short");
  });

  it("returns 'Weak' for 8 lowercase chars", () => {
    expect(scorePassword("aaaaaaaa").label).toBe("Weak");
  });

  it("returns at least 'Okay' when length >= 12", () => {
    expect(scorePassword("aaaaaaaaaaaa").value).toBeGreaterThanOrEqual(2);
  });

  it("rewards mixed casing", () => {
    expect(scorePassword("AbAbAbAb").value).toBeGreaterThan(scorePassword("abababab").value);
  });

  it("rewards digits + symbols + length together (Excellent at top)", () => {
    expect(scorePassword("Abcdefgh1234!@").label).toBe("Excellent");
  });

  it("clamps the score at 4 even with extra entropy", () => {
    const s = scorePassword("Abcdefghijklmnop1234!@#$");
    expect(s.value).toBe(4);
  });
});

describe("PasswordStrength", () => {
  it("renders nothing when password is empty", () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the label corresponding to the score", () => {
    render(<PasswordStrength password="aaaaaaaa" />);
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("renders 4 segments in the bar", () => {
    const { container } = render(<PasswordStrength password="abc" />);
    const segments = container.querySelectorAll(".rounded-full");
    expect(segments.length).toBe(4);
  });
});
