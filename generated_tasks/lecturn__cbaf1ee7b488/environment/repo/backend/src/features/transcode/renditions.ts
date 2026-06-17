// Bitrates from Apple's HLS authoring guide §3.5; widths assume 16:9.
export const RENDITIONS = [
  { height: 1080, width: 1920, bitrateKbps: 5000, audioBitrateKbps: 192 },
  { height: 720, width: 1280, bitrateKbps: 2800, audioBitrateKbps: 128 },
  { height: 480, width: 854, bitrateKbps: 1400, audioBitrateKbps: 96 },
] as const;

export type RenditionSpec = (typeof RENDITIONS)[number];

// Always returns at least the lowest rung so short/low-res sources still get adaptive switching.
export function pickRenditions(sourceHeight: number): RenditionSpec[] {
  const eligible = RENDITIONS.filter((r) => r.height <= sourceHeight);
  if (eligible.length === 0) {
    return [RENDITIONS[RENDITIONS.length - 1]!];
  }
  return eligible;
}
