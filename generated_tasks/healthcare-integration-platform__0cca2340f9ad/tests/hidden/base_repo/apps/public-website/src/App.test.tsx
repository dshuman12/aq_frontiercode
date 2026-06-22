import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("public-website app", () => {
  it("exports a renderable app component", () => {
    expect(typeof App).toBe("function");
  });
});
