import { describe, expect, it } from "vitest";
import { buildMasterPlaylist } from "~/features/transcode/ffmpeg";

describe("buildMasterPlaylist", () => {
  it("emits the EXTM3U header on the first line", () => {
    const m3u = buildMasterPlaylist([]);
    expect(m3u.split("\n")[0]).toBe("#EXTM3U");
  });

  it("includes EXT-X-VERSION:6", () => {
    const m3u = buildMasterPlaylist([]);
    expect(m3u).toContain("#EXT-X-VERSION:6");
  });

  it("emits one EXT-X-STREAM-INF per rendition with bandwidth + resolution", () => {
    const m3u = buildMasterPlaylist([
      { bandwidth: 5_000_000, width: 1920, height: 1080, manifestRelativePath: "1080p/index.m3u8" },
      { bandwidth: 2_800_000, width: 1280, height: 720, manifestRelativePath: "720p/index.m3u8" },
    ]);
    const stream = m3u.split("\n").filter((l) => l.startsWith("#EXT-X-STREAM-INF"));
    expect(stream.length).toBe(2);
    expect(stream[0]).toContain("BANDWIDTH=5000000");
    expect(stream[0]).toContain("RESOLUTION=1920x1080");
    expect(stream[1]).toContain("BANDWIDTH=2800000");
    expect(stream[1]).toContain("RESOLUTION=1280x720");
  });

  it("places the rendition manifest path on the line after its STREAM-INF", () => {
    const m3u = buildMasterPlaylist([
      { bandwidth: 1_000_000, width: 854, height: 480, manifestRelativePath: "480p/index.m3u8" },
    ]);
    const lines = m3u.split("\n").filter(Boolean);
    const streamIdx = lines.findIndex((l) => l.startsWith("#EXT-X-STREAM-INF"));
    expect(lines[streamIdx + 1]).toBe("480p/index.m3u8");
  });

  it("uses the default avc1+mp4a CODECS string when none provided", () => {
    const m3u = buildMasterPlaylist([
      { bandwidth: 1_000_000, width: 854, height: 480, manifestRelativePath: "480p/index.m3u8" },
    ]);
    expect(m3u).toContain('CODECS="avc1.4d401f,mp4a.40.2"');
  });

  it("respects an explicit CODECS override", () => {
    const m3u = buildMasterPlaylist([
      {
        bandwidth: 1_000_000,
        width: 854,
        height: 480,
        manifestRelativePath: "480p/index.m3u8",
        codecs: "av01.0.05M.08,opus",
      },
    ]);
    expect(m3u).toContain('CODECS="av01.0.05M.08,opus"');
  });

  it("ends with a trailing newline", () => {
    const m3u = buildMasterPlaylist([
      { bandwidth: 1_000_000, width: 854, height: 480, manifestRelativePath: "480p/index.m3u8" },
    ]);
    expect(m3u.endsWith("\n")).toBe(true);
  });
});
