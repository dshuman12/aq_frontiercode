import { describe, expect, it } from "vitest";
import { cn, formatDuration } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("a", "b")).toContain("b");
  });

  it("filters falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("dedupes Tailwind conflicts via twMerge", () => {
    // p-2 should be overridden by p-4 (last wins via twMerge).
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatDuration", () => {
  it("returns '0m' for zero / falsy input", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("renders minutes-only when under an hour", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(120)).toBe("2m");
    expect(formatDuration(3540)).toBe("59m");
  });

  it("renders hours and minutes when over an hour", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3660)).toBe("1h 1m");
    expect(formatDuration(7325)).toBe("2h 2m");
  });

  it("floors fractional seconds within a minute", () => {
    expect(formatDuration(119)).toBe("1m");
  });
});
