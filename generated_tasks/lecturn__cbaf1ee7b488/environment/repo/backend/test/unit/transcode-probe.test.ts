import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import * as childProcess from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof childProcess>("node:child_process");
  return { ...actual, spawn: vi.fn() };
});

import { probeFile } from "~/features/transcode/probe";

const spawnMock = vi.mocked(childProcess.spawn);

class FakeChild extends EventEmitter {
  stdout: Readable;
  stderr: Readable;
  constructor(stdoutText: string, stderrText: string) {
    super();
    this.stdout = Readable.from(Buffer.from(stdoutText));
    this.stderr = Readable.from(Buffer.from(stderrText));
  }
}

afterEach(() => {
  vi.clearAllMocks();
});

function ffprobeJson(payload: object) {
  return JSON.stringify(payload);
}

describe("probeFile", () => {
  it("parses width/height/codecs/duration/bitrate from a healthy ffprobe response", async () => {
    const child = new FakeChild(
      ffprobeJson({
        streams: [
          {
            codec_type: "video",
            codec_name: "h264",
            width: 1920,
            height: 1080,
          },
          { codec_type: "audio", codec_name: "aac" },
        ],
        format: { duration: "12.34", bit_rate: "5000000" },
      }),
      "",
    );
    spawnMock.mockReturnValue(child as unknown as childProcess.ChildProcess);

    const promise = probeFile("/x.mp4");
    setImmediate(() => child.emit("close", 0));
    const result = await promise;

    expect(result).toMatchObject({
      durationSec: 12,
      width: 1920,
      height: 1080,
      videoCodec: "h264",
      audioCodec: "aac",
      bitrate: 5_000_000,
    });
    expect(spawnMock).toHaveBeenCalledWith(
      "ffprobe",
      expect.arrayContaining(["-print_format", "json"]),
    );
  });

  it("returns audioCodec = null when there's no audio stream", async () => {
    const child = new FakeChild(
      ffprobeJson({
        streams: [{ codec_type: "video", codec_name: "h264", width: 640, height: 360 }],
        format: { duration: "5", bit_rate: "0" },
      }),
      "",
    );
    spawnMock.mockReturnValue(child as unknown as childProcess.ChildProcess);
    const promise = probeFile("/y.mp4");
    setImmediate(() => child.emit("close", 0));
    const result = await promise;
    expect(result.audioCodec).toBeNull();
  });

  it("rejects when ffprobe exits non-zero", async () => {
    const child = new FakeChild("", "Cannot decode\n");
    spawnMock.mockReturnValue(child as unknown as childProcess.ChildProcess);
    const promise = probeFile("/bad.mp4");
    setImmediate(() => child.emit("close", 1));
    await expect(promise).rejects.toThrow(/ffprobe exited 1/);
  });

  it("rejects when stdout is not valid JSON", async () => {
    const child = new FakeChild("not-json", "");
    spawnMock.mockReturnValue(child as unknown as childProcess.ChildProcess);
    const promise = probeFile("/junk.mp4");
    setImmediate(() => child.emit("close", 0));
    await expect(promise).rejects.toThrow();
  });

  it("rejects when there's no video stream in the response", async () => {
    const child = new FakeChild(
      ffprobeJson({ streams: [{ codec_type: "audio" }], format: { duration: "5" } }),
      "",
    );
    spawnMock.mockReturnValue(child as unknown as childProcess.ChildProcess);
    const promise = probeFile("/audio-only.mp4");
    setImmediate(() => child.emit("close", 0));
    await expect(promise).rejects.toThrow(/No video stream/);
  });

  it("rejects when the spawn itself errors", async () => {
    const child = new FakeChild("", "");
    spawnMock.mockReturnValue(child as unknown as childProcess.ChildProcess);
    const promise = probeFile("/missing.mp4");
    setImmediate(() => child.emit("error", new Error("ENOENT: no ffprobe")));
    await expect(promise).rejects.toThrow(/ENOENT/);
  });
});
