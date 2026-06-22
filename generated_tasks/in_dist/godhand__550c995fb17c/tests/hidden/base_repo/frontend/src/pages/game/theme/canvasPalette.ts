export type TerrainColor = {
  fill: string
  stroke: string
}

export type CanvasPalette = {
  terrain: Record<number, TerrainColor>
  terrainBlocked: TerrainColor
  gridStrokeRgb: string
  starRgb: string
  bridgeSlotReachableRgb: string
  bridgeSlotLockedRgb: string
  hubPulseRgb: string
  beltFlowRgb: string
  minerRotorRgb: string
  machinePortPreviewInput: string
  machinePortPreviewOutput: string
  machinePortInput: string
  machinePortOutput: string
  machineTokenBg: string
  hoverOutlineRgb: string
}

const FALLBACK_PALETTE: CanvasPalette = {
  terrain: {
    1: { fill: '#36594e', stroke: '#4a7062' },
    2: { fill: '#456056', stroke: '#57766a' },
    3: { fill: '#52666b', stroke: '#688289' },
    4: { fill: '#5d6075', stroke: '#747791' },
  },
  terrainBlocked: { fill: '#1e2429', stroke: '#313c43' },
  gridStrokeRgb: '226, 246, 238',
  starRgb: '217, 245, 234',
  bridgeSlotReachableRgb: '194, 223, 213',
  bridgeSlotLockedRgb: '130, 149, 141',
  hubPulseRgb: '255, 238, 164',
  beltFlowRgb: '231, 248, 255',
  minerRotorRgb: '235, 255, 246',
  machinePortPreviewInput: 'rgba(43, 86, 62, 0.9)',
  machinePortPreviewOutput: 'rgba(95, 69, 30, 0.92)',
  machinePortInput: 'rgba(39, 85, 61, 0.9)',
  machinePortOutput: 'rgba(102, 74, 32, 0.92)',
  machineTokenBg: 'rgba(12, 24, 20, 0.78)',
  hoverOutlineRgb: '242, 255, 248',
}

function cssVar(name: string): string | null {
  if (typeof window === 'undefined') return null
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value.length > 0 ? value : null
}

function withFallback(name: string, fallback: string): string {
  return cssVar(name) ?? fallback
}

function readCanvasPalette(): CanvasPalette {
  return {
    terrain: {
      1: {
        fill: withFallback('--game-terrain-valley-1-fill', FALLBACK_PALETTE.terrain[1].fill),
        stroke: withFallback('--game-terrain-valley-1-stroke', FALLBACK_PALETTE.terrain[1].stroke),
      },
      2: {
        fill: withFallback('--game-terrain-valley-2-fill', FALLBACK_PALETTE.terrain[2].fill),
        stroke: withFallback('--game-terrain-valley-2-stroke', FALLBACK_PALETTE.terrain[2].stroke),
      },
      3: {
        fill: withFallback('--game-terrain-valley-3-fill', FALLBACK_PALETTE.terrain[3].fill),
        stroke: withFallback('--game-terrain-valley-3-stroke', FALLBACK_PALETTE.terrain[3].stroke),
      },
      4: {
        fill: withFallback('--game-terrain-valley-4-fill', FALLBACK_PALETTE.terrain[4].fill),
        stroke: withFallback('--game-terrain-valley-4-stroke', FALLBACK_PALETTE.terrain[4].stroke),
      },
    },
    terrainBlocked: {
      fill: withFallback('--game-terrain-blocked-fill', FALLBACK_PALETTE.terrainBlocked.fill),
      stroke: withFallback('--game-terrain-blocked-stroke', FALLBACK_PALETTE.terrainBlocked.stroke),
    },
    gridStrokeRgb: withFallback('--game-grid-stroke-rgb', FALLBACK_PALETTE.gridStrokeRgb),
    starRgb: withFallback('--game-star-rgb', FALLBACK_PALETTE.starRgb),
    bridgeSlotReachableRgb: withFallback(
      '--game-bridge-slot-reachable-rgb',
      FALLBACK_PALETTE.bridgeSlotReachableRgb,
    ),
    bridgeSlotLockedRgb: withFallback('--game-bridge-slot-locked-rgb', FALLBACK_PALETTE.bridgeSlotLockedRgb),
    hubPulseRgb: withFallback('--game-hub-pulse-rgb', FALLBACK_PALETTE.hubPulseRgb),
    beltFlowRgb: withFallback('--game-belt-flow-rgb', FALLBACK_PALETTE.beltFlowRgb),
    minerRotorRgb: withFallback('--game-miner-rotor-rgb', FALLBACK_PALETTE.minerRotorRgb),
    machinePortPreviewInput: withFallback(
      '--game-machine-port-preview-input',
      FALLBACK_PALETTE.machinePortPreviewInput,
    ),
    machinePortPreviewOutput: withFallback(
      '--game-machine-port-preview-output',
      FALLBACK_PALETTE.machinePortPreviewOutput,
    ),
    machinePortInput: withFallback('--game-machine-port-input', FALLBACK_PALETTE.machinePortInput),
    machinePortOutput: withFallback('--game-machine-port-output', FALLBACK_PALETTE.machinePortOutput),
    machineTokenBg: withFallback('--game-machine-token-bg', FALLBACK_PALETTE.machineTokenBg),
    hoverOutlineRgb: withFallback('--game-hover-outline-rgb', FALLBACK_PALETTE.hoverOutlineRgb),
  }
}

let cached: CanvasPalette | null = null

export function getCanvasPalette(): CanvasPalette {
  if (cached) return cached
  cached = readCanvasPalette()
  return cached
}
