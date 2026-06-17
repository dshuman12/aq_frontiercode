import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./format-time";

describe("formatTimestamp", () => {
  it("renders M:SS for sub-hour values", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(7)).toBe("0:07");
    expect(formatTimestamp(65)).toBe("1:05");
    expect(formatTimestamp(3599)).toBe("59:59");
  });

  it("renders H:MM:SS once we cross 1h", () => {
    expect(formatTimestamp(3600)).toBe("1:00:00");
    expect(formatTimestamp(3661)).toBe("1:01:01");
    expect(formatTimestamp(7325)).toBe("2:02:05");
  });

  it("floors fractional seconds (we don't render decimals)", () => {
    expect(formatTimestamp(7.9)).toBe("0:07");
  });

  it("returns 0:00 for negative or non-finite input", () => {
    expect(formatTimestamp(-5)).toBe("0:00");
    expect(formatTimestamp(NaN)).toBe("0:00");
    expect(formatTimestamp(Infinity)).toBe("0:00");
  });
});
