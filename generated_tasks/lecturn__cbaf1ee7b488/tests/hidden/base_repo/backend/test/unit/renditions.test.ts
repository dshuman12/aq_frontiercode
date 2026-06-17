import { describe, expect, it } from "vitest";
import { pickRenditions, RENDITIONS } from "~/features/transcode/renditions";

describe("pickRenditions", () => {
  it("returns all rungs when source >= 1080p", () => {
    const picked = pickRenditions(1080);
    expect(picked.map((r) => r.height)).toEqual([1080, 720, 480]);
  });

  it("excludes rungs taller than the source", () => {
    const picked = pickRenditions(720);
    expect(picked.map((r) => r.height)).toEqual([720, 480]);
  });

  it("returns just the smallest rung for short sources", () => {
    const picked = pickRenditions(360);
    // 480 is the smallest rung defined; nothing fits ≤ 360, so we fall back
    // to the smallest rung anyway so the player can still load.
    expect(picked).toEqual([RENDITIONS[RENDITIONS.length - 1]]);
  });

  it("includes 4K source as if it were 1080p (no super-resolution rung)", () => {
    const picked = pickRenditions(2160);
    expect(picked.map((r) => r.height)).toEqual([1080, 720, 480]);
  });

  it("never returns an empty array", () => {
    expect(pickRenditions(0).length).toBeGreaterThan(0);
    expect(pickRenditions(1).length).toBeGreaterThan(0);
    expect(pickRenditions(-100).length).toBeGreaterThan(0);
  });

  it("preserves rendition spec shape (width, bitrate, audio)", () => {
    const picked = pickRenditions(1080);
    for (const r of picked) {
      expect(r.height).toBeGreaterThan(0);
      expect(r.width).toBeGreaterThan(0);
      expect(r.bitrateKbps).toBeGreaterThan(0);
      expect(r.audioBitrateKbps).toBeGreaterThan(0);
    }
  });
});
