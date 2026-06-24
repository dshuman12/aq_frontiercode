import type { TerrainMap } from '../types'
import { fbmNoise2D, createSeededNoise2D } from '../math/noise'
import { WORLDGEN_CONFIG } from '../worldgenCatalog'
import type { GeneratedIsland } from './types'

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function forceLand(terrain: TerrainMap, x: number, y: number, valley: number): void {
  const key = cellKey(x, y)
  const existing = terrain[key]
  if (existing === undefined || valley < existing) {
    terrain[key] = valley
  }
}

export function carveIslandTerrain(terrain: TerrainMap, islands: GeneratedIsland[], seed: number): void {
  const shape = WORLDGEN_CONFIG.islandShape
  const macroNoise = createSeededNoise2D(seed ^ 0x1f123bb5)
  const detailNoise = createSeededNoise2D(seed ^ 0xa84f3c9d)

  for (const island of islands) {
    const maxEdgeMultiplier =
      1 +
      Math.abs(shape.coastAmplitude) +
      Math.abs(shape.detailAmplitude) +
      Math.abs(shape.rippleAmplitude) +
      0.4
    const outerRadius = Math.ceil(island.radius * maxEdgeMultiplier) + 2

    for (let y = island.center.y - outerRadius; y <= island.center.y + outerRadius; y += 1) {
      for (let x = island.center.x - outerRadius; x <= island.center.x + outerRadius; x += 1) {
        const dx = x - island.center.x
        const dy = y - island.center.y
        const dist = Math.hypot(dx, dy)
        if (dist > outerRadius) continue

        const warpX =
          fbmNoise2D(
            detailNoise,
            (x + island.id * 17.23) * shape.warpFrequency,
            (y - island.id * 29.11) * shape.warpFrequency,
            Math.max(2, shape.octaves - 1),
            shape.persistence,
            shape.lacunarity,
          ) *
          shape.warpAmplitude *
          island.radius *
          0.45
        const warpY =
          fbmNoise2D(
            detailNoise,
            (x - island.id * 11.37) * shape.warpFrequency,
            (y + island.id * 13.97) * shape.warpFrequency,
            Math.max(2, shape.octaves - 1),
            shape.persistence,
            shape.lacunarity,
          ) *
          shape.warpAmplitude *
          island.radius *
          0.45

        const sampleX = x + warpX
        const sampleY = y + warpY

        const macroNoiseValue = fbmNoise2D(
          macroNoise,
          sampleX * shape.baseFrequency,
          sampleY * shape.baseFrequency,
          shape.octaves,
          shape.persistence,
          shape.lacunarity,
        )
        const detailNoiseValue = fbmNoise2D(
          detailNoise,
          (sampleX + island.id * 7.13) * shape.detailFrequency,
          (sampleY - island.id * 5.61) * shape.detailFrequency,
          Math.max(2, shape.octaves - 1),
          shape.persistence * 0.92,
          shape.lacunarity,
        )

        const angle = Math.atan2(dy, dx)
        const ripple =
          Math.sin(angle * shape.rippleFrequency + macroNoiseValue * 2.4 + island.id * 0.63) *
          shape.rippleAmplitude
        const radialNoise =
          1 + macroNoiseValue * shape.coastAmplitude + detailNoiseValue * shape.detailAmplitude + ripple
        const centerBias = 1 - Math.min(1, dist / Math.max(1, island.radius * 0.6))
        const edgeRadius = island.radius * Math.max(0.45, radialNoise + centerBias * 0.32)

        if (dist <= edgeRadius) {
          forceLand(terrain, x, y, island.valley)
        }
      }
    }
  }
}
