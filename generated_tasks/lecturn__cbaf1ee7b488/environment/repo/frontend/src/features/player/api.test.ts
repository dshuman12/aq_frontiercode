import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPut = vi.fn();
vi.mock("~/lib/api-client", () => ({
  api: { put: (...a: unknown[]) => mockPut(...a) },
}));

import { playerApi } from "./api";

beforeEach(() => mockPut.mockReset());
afterEach(() => vi.clearAllMocks());

describe("playerApi.saveProgress", () => {
  it("issues PUT /progress/:id with positionSec and undefined completed", async () => {
    mockPut.mockResolvedValue(undefined);
    await playerApi.saveProgress("ep-1", 42);
    expect(mockPut).toHaveBeenCalledWith("/progress/ep-1", {
      positionSec: 42,
      completed: undefined,
    });
  });

  it("forwards completed when provided", async () => {
    mockPut.mockResolvedValue(undefined);
    await playerApi.saveProgress("ep-1", 0, true);
    expect(mockPut).toHaveBeenCalledWith("/progress/ep-1", {
      positionSec: 0,
      completed: true,
    });
  });
});
