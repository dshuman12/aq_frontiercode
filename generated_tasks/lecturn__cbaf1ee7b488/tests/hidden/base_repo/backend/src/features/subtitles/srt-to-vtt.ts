// Browser <track> elements only accept VTT, so SRT is converted at read time.

const TIMESTAMP_LINE = /^(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})(.*)$/;
const CUE_INDEX_LINE = /^\d+$/;

export function convertSrtToVtt(srt: string): string {
  const lines = srt.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = ["WEBVTT", ""];

  let i = 0;
  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();

    if (line === "") {
      // Collapse runs of blanks to one — VTT only needs a single blank as cue separator.
      if (out[out.length - 1] !== "") out.push("");
      i++;
      continue;
    }

    // Drop SRT numeric cue indices: VTT identifiers are optional, and bare numerics confuse some parsers.
    if (CUE_INDEX_LINE.test(line) && i + 1 < lines.length && TIMESTAMP_LINE.test(lines[i + 1] ?? "")) {
      i++;
      continue;
    }

    const tsMatch = TIMESTAMP_LINE.exec(line);
    if (tsMatch) {
      const [, startHms, startMs, endHms, endMs, settings] = tsMatch;
      out.push(`${startHms}.${startMs} --> ${endHms}.${endMs}${settings ?? ""}`);
      i++;
      continue;
    }

    out.push(lines[i] ?? "");
    i++;
  }

  if (out[out.length - 1] !== "") out.push("");
  return out.join("\n");
}
