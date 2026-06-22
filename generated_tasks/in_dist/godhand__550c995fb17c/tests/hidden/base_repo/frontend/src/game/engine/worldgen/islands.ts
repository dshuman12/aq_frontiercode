import type { GridPos } from '../types'
import type { RandomSource } from '../math/random'
import { randomFloatInRange, randomIntInRange } from '../math/random'
import { WORLDGEN_CONFIG, type WorldgenValleyConfig } from '../worldgenCatalog'
import type { GeneratedIsland, IslandPlacementResult } from './types'

function withinWorldBounds(center: GridPos, radius: number): boolean {
  const bounds = WORLDGEN_CONFIG.worldBounds
  return (
    center.x - radius - bounds.padding >= -bounds.halfWidth &&
    center.x + radius + bounds.padding <= bounds.halfWidth &&
    center.y - radius - bounds.padding >= -bounds.halfHeight &&
    center.y + radius + bounds.padding <= bounds.halfHeight
  )
}

function canPlaceIslandCenter(
  islands: GeneratedIsland[],
  center: GridPos,
  radius: number,
  minGap: number,
): boolean {
  for (const island of islands) {
    const required = island.radius + radius + minGap
    if (Math.hypot(center.x - island.center.x, center.y - island.center.y) < required) {
      return false
    }
  }
  return true
}

function tryPlaceIslandCenter(
  islands: GeneratedIsland[],
  radius: number,
  sampleCandidate: () => GridPos,
): GridPos | null {
  const attempts = WORLDGEN_CONFIG.placement.attemptsPerIsland
  const minGap = WORLDGEN_CONFIG.placement.minIslandGap

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = sampleCandidate()
    const relaxedGap = minGap * (1 - (attempt / attempts) * 0.55)
    if (!withinWorldBounds(candidate, radius)) continue
    if (!canPlaceIslandCenter(islands, candidate, radius, relaxedGap)) continue
    return candidate
  }
  return null
}

function sampleMajorCenter(config: WorldgenValleyConfig, rng: RandomSource): GridPos {
  return {
    x: config.majorAnchor.x + Math.round((rng() - 0.5) * 2 * config.majorSpread.x),
    y: config.majorAnchor.y + Math.round((rng() - 0.5) * 2 * config.majorSpread.y),
  }
}

function sampleSatelliteCenter(
  major: GeneratedIsland,
  config: WorldgenValleyConfig,
  rng: RandomSource,
): GridPos {
  const angle = rng() * Math.PI * 2
  const distance = randomFloatInRange(rng, config.satelliteDistanceMin, config.satelliteDistanceMax)
  const jitterX = (rng() - 0.5) * 2 * config.satelliteJitter
  const jitterY = (rng() - 0.5) * 2 * config.satelliteJitter
  return {
    x: Math.round(major.center.x + Math.cos(angle) * distance + jitterX),
    y: Math.round(major.center.y + Math.sin(angle) * distance + jitterY),
  }
}

export function generateIslands(rng: RandomSource): IslandPlacementResult {
  const majorIslands: GeneratedIsland[] = []
  const satelliteIslands: GeneratedIsland[] = []
  const allIslands: GeneratedIsland[] = []

  let nextIslandId = 1
  for (const valleyConfig of WORLDGEN_CONFIG.valleys) {
    for (let majorIndex = 0; majorIndex < valleyConfig.majorCount; majorIndex += 1) {
      const majorRadius = randomIntInRange(rng, valleyConfig.majorRadiusMin, valleyConfig.majorRadiusMax)
      let majorCenter = tryPlaceIslandCenter(allIslands, majorRadius, () => sampleMajorCenter(valleyConfig, rng))
      if (!majorCenter) {
        const fallback = valleyConfig.majorAnchor
        if (
          withinWorldBounds(fallback, majorRadius) &&
          canPlaceIslandCenter(allIslands, fallback, majorRadius, WORLDGEN_CONFIG.placement.minIslandGap * 0.35)
        ) {
          majorCenter = fallback
        }
      }
      if (!majorCenter) continue

      const majorIsland: GeneratedIsland = {
        id: nextIslandId,
        valley: valleyConfig.valley,
        center: majorCenter,
        radius: majorRadius,
        kind: 'major',
      }
      nextIslandId += 1
      majorIslands.push(majorIsland)
      allIslands.push(majorIsland)

      const satelliteCount = randomIntInRange(
        rng,
        valleyConfig.satelliteCountMin,
        valleyConfig.satelliteCountMax,
      )
      for (let satelliteIndex = 0; satelliteIndex < satelliteCount; satelliteIndex += 1) {
        const satelliteRadius = randomIntInRange(
          rng,
          valleyConfig.satelliteRadiusMin,
          valleyConfig.satelliteRadiusMax,
        )
        const satelliteCenter = tryPlaceIslandCenter(allIslands, satelliteRadius, () =>
          sampleSatelliteCenter(majorIsland, valleyConfig, rng),
        )
        if (!satelliteCenter) continue

        const satelliteIsland: GeneratedIsland = {
          id: nextIslandId,
          valley: valleyConfig.valley,
          center: satelliteCenter,
          radius: satelliteRadius,
          kind: 'satellite',
        }
        nextIslandId += 1
        satelliteIslands.push(satelliteIsland)
        allIslands.push(satelliteIsland)
      }
    }
  }

  if (allIslands.length === 0) {
    throw new Error('World generation failed to place islands.')
  }

  return {
    majorIslands,
    satelliteIslands,
    allIslands,
  }
}
