import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { episodeOutputDir, checkDisk } from "~/features/transcode/storage";

describe("episodeOutputDir", () => {
  it("resolves under MEDIA_ROOT/transcoded/<episodeId>", () => {
    const id = "deadbeef-1111-2222-3333-444444444444";
    const out = episodeOutputDir(id);
    expect(out).toMatch(/transcoded\/deadbeef-/);
    expect(out.startsWith(resolve(process.env.MEDIA_ROOT!))).toBe(true);
  });

  it("returns absolute paths", () => {
    expect(episodeOutputDir("abc").startsWith("/")).toBe(true);
  });
});

describe("checkDisk", () => {
  it("reports free + total bytes and a derived freeGb value", async () => {
    const status = await checkDisk();
    expect(status.freeBytes).toBeGreaterThan(0);
    expect(status.totalBytes).toBeGreaterThan(status.freeBytes);
    expect(status.freeGb).toBeCloseTo(status.freeBytes / 1024 ** 3, 6);
  });

  it("flips underThreshold based on TRANSCODE_DISK_THRESHOLD_GB", async () => {
    const status = await checkDisk();
    // We can't force the disk to fill, but the boolean should match the math
    const threshold = Number(process.env.TRANSCODE_DISK_THRESHOLD_GB ?? "5");
    expect(status.underThreshold).toBe(status.freeGb < threshold);
  });
});
