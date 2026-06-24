import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("admin-dashboard app", () => {
  it("exports a renderable app component", () => {
    expect(typeof App).toBe("function");
  });
});
