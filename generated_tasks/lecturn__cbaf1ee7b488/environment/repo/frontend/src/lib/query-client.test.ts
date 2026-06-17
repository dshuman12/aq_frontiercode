import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { makeQueryClient } from "./query-client";

describe("makeQueryClient", () => {
  it("returns a QueryClient instance", () => {
    expect(makeQueryClient()).toBeInstanceOf(QueryClient);
  });

  it("returns a fresh instance on each call (different references)", () => {
    expect(makeQueryClient()).not.toBe(makeQueryClient());
  });
});
