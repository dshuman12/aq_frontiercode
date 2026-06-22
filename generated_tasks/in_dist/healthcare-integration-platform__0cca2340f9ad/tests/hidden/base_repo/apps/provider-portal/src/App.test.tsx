import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("provider-portal app", () => {
  it("exports a renderable app component", () => {
    expect(typeof App).toBe("function");
  });
});
