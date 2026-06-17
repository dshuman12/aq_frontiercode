import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as childProcess from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof childProcess>("node:child_process");
  return { ...actual, spawn: vi.fn() };
});

import { transcodeRendition } from "~/features/transcode/ffmpeg";

const spawnMock = vi.mocked(childProcess.spawn);

class FakeChild extends EventEmitter {
  stdout: Readable;
  stderr: Readable;
  killed = false;
  constructor(stderrChunks: string[] = []) {
    super();
    this.stdout = Readable.from(Buffer.alloc(0));
    this.stderr = Readable.from(stderrChunks.map((s) => Buffer.from(s)));
  }
  kill() {
    this.killed = true;
    return true;
  }
}

// Schedule the spawn return + a terminal event AFTER spawn() returns and
// handlers attach. setImmediate fires in the next "check" phase, by which
// point the Promise constructor in transcodeRendition has finished wiring
// up child.on("close" / "error", ...).
function setupSpawn(opts: {
  stderr?: string[];
  exitCode?: number;
  emitError?: Error;
}) {
  const child = new FakeChild(opts.stderr ?? []);
  spawnMock.mockImplementation(() => {
    setImmediate(() => {
      if (opts.emitError) child.emit("error", opts.emitError);
      else child.emit("close", opts.exitCode ?? 0);
    });
    return child as unknown as childProcess.ChildProcess;
  });
  return child;
}

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "lecturn-ffmpeg-"));
});

afterEach(async () => {
  vi.clearAllMocks();
  spawnMock.mockReset();
  await rm(workDir, { recursive: true, force: true });
});

const baseRendition = {
  height: 720,
  width: 1280,
  bitrateKbps: 2800,
  audioBitrateKbps: 128,
} as const;

describe("transcodeRendition", () => {
  it("invokes ffmpeg with the right scale, codec, and HLS args", async () => {
    setupSpawn({ exitCode: 0 });
    await transcodeRendition({
      inputPath: "/in.mp4",
      outputDir: workDir,
      rendition: baseRendition,
      durationSec: 10,
    });
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [bin, args] = spawnMock.mock.calls[0]!;
    expect(bin).toBe("ffmpeg");
    expect(args).toContain("-i");
    expect(args).toContain("/in.mp4");
    expect(args).toContain("libx264");
    expect(args).toContain("yuv420p");
    expect(args.find((a: string) => a.startsWith("scale="))).toMatch(
      /force_divisible_by=2/,
    );
    expect(args).toContain("-f");
    expect(args.indexOf("hls")).toBeGreaterThan(-1);
    expect(args).toContain("aac");
  });

  it("creates the per-rendition subdirectory and returns the manifest path", async () => {
    setupSpawn({ exitCode: 0 });
    const result = await transcodeRendition({
      inputPath: "/in.mp4",
      outputDir: workDir,
      rendition: baseRendition,
      durationSec: 10,
    });
    expect(result.manifestPath.endsWith("/720p/index.m3u8")).toBe(true);
    expect(result.segmentsDir.endsWith("/720p")).toBe(true);
  });

  it("parses progress out_time_us= lines and forwards them as fractions", async () => {
    setupSpawn({
      exitCode: 0,
      stderr: [
        "frame=10\n",
        "out_time_us=2500000\n", // 2.5s of 10s = 25%
        "frame=20\n",
        "out_time_us=5000000\n", // 50%
        "out_time_us=10000000\n", // 100%
      ],
    });
    const seen: number[] = [];
    await transcodeRendition({
      inputPath: "/x.mp4",
      outputDir: workDir,
      rendition: baseRendition,
      durationSec: 10,
      onProgress: (p) => seen.push(p),
    });
    expect(seen.length).toBe(3);
    expect(seen[0]).toBeCloseTo(0.25, 5);
    expect(seen[1]).toBeCloseTo(0.5, 5);
    expect(seen[2]).toBe(1);
  });

  it("clamps progress to [0, 1] even if ffmpeg overshoots the duration", async () => {
    setupSpawn({ exitCode: 0, stderr: ["out_time_us=20000000\n"] });
    const seen: number[] = [];
    await transcodeRendition({
      inputPath: "/x.mp4",
      outputDir: workDir,
      rendition: baseRendition,
      durationSec: 10,
      onProgress: (p) => seen.push(p),
    });
    expect(seen[0]).toBe(1);
  });

  it("rejects when ffmpeg exits non-zero", async () => {
    setupSpawn({ exitCode: 187 });
    await expect(
      transcodeRendition({
        inputPath: "/x.mp4",
        outputDir: workDir,
        rendition: baseRendition,
        durationSec: 10,
      }),
    ).rejects.toThrow(/ffmpeg exited 187/);
  });

  it("kills the child and rejects when the AbortSignal fires", async () => {
    // For the abort test we drive timing manually so abort happens BEFORE
    // the close event fires. We rely on vi.waitFor to know spawn() has
    // returned and handlers are attached.
    const child = new FakeChild();
    spawnMock.mockImplementation(
      () => child as unknown as childProcess.ChildProcess,
    );

    const ac = new AbortController();
    const promise = transcodeRendition({
      inputPath: "/x.mp4",
      outputDir: workDir,
      rendition: baseRendition,
      durationSec: 10,
      signal: ac.signal,
    });
    await vi.waitFor(() => expect(spawnMock).toHaveBeenCalled());
    ac.abort();
    child.emit("close", 130); // pretend the kill landed
    await expect(promise).rejects.toThrow(/aborted/);
    expect(child.killed).toBe(true);
  });

  it("rejects when the spawn itself errors (binary missing)", async () => {
    setupSpawn({ emitError: new Error("spawn ENOENT") });
    await expect(
      transcodeRendition({
        inputPath: "/x.mp4",
        outputDir: workDir,
        rendition: baseRendition,
        durationSec: 10,
      }),
    ).rejects.toThrow(/ENOENT/);
  });
});
