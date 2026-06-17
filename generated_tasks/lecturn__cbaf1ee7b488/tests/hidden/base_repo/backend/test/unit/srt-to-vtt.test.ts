import { describe, expect, it } from "vitest";
import { convertSrtToVtt } from "~/features/subtitles/srt-to-vtt";

describe("convertSrtToVtt", () => {
  it("prepends the WEBVTT header", () => {
    const out = convertSrtToVtt("");
    expect(out.startsWith("WEBVTT\n")).toBe(true);
  });

  it("converts comma-separated milliseconds in timestamps to dots", () => {
    const srt = `1\n00:00:01,500 --> 00:00:03,750\nHi\n`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt).toContain("00:00:01.500 --> 00:00:03.750");
    expect(vtt).not.toContain("00:00:01,500");
  });

  it("strips numeric cue indices that precede a timestamp", () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nFirst\n\n2\n00:00:03,000 --> 00:00:04,000\nSecond\n`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt).not.toMatch(/^1$/m);
    expect(vtt).not.toMatch(/^2$/m);
  });

  it("preserves multi-line cue text", () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nLine one\nLine two\n`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt).toContain("Line one");
    expect(vtt).toContain("Line two");
  });

  it("preserves HTML tags within cues (italics, bold)", () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\n<i>italic</i> and <b>bold</b>\n`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt).toContain("<i>italic</i>");
    expect(vtt).toContain("<b>bold</b>");
  });

  it("normalizes CRLF line endings to LF", () => {
    const srt = "1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n";
    const vtt = convertSrtToVtt(srt);
    expect(vtt).not.toContain("\r");
  });

  it("collapses consecutive blank lines into a single separator", () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nA\n\n\n\n2\n00:00:03,000 --> 00:00:04,000\nB\n`;
    const vtt = convertSrtToVtt(srt);
    // Three consecutive blanks become at most one in the output.
    expect(vtt).not.toMatch(/\n\n\n/);
  });

  it("ends with a trailing newline", () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nHello`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt.endsWith("\n")).toBe(true);
  });

  it("preserves cue settings (e.g. align, line) appended after the timestamp", () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000 align:start line:5%\nHi\n`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt).toContain("align:start line:5%");
  });

  it("handles an empty input gracefully", () => {
    const out = convertSrtToVtt("");
    expect(out.startsWith("WEBVTT")).toBe(true);
    expect(out.endsWith("\n")).toBe(true);
  });

  it("does not strip lines that look like cue text but happen to be numeric", () => {
    // A standalone "5" line that doesn't precede a timestamp should be kept.
    const srt = `1\n00:00:01,000 --> 00:00:02,000\n5\n`;
    const vtt = convertSrtToVtt(srt);
    expect(vtt).toContain("5");
  });
});
