import type { Direction, GridPos, Inventory, OreType, TerrainMap } from './types'
import { WORLDGEN_CONFIG, type WorldgenValleyConfig } from './worldgenCatalog'

type SeededDeposit = {
  x: number
  y: number
  ore: OreType
  richness: number
}

type SeededBelt = {
  x: number
  y: number
  dir: Direction
}

type SeededMiner = {
  x: number
  y: number
  dir: Direction
  kind: 'miner' | 'drill'
}

type GeneratedIsland = {
  id: number
  valley: number
  center: GridPos
  radius: number
  kind: 'major' | 'satellite'
}

export type SeededWorld = {
  terrain: TerrainMap
  bridgeSlots: Record<string, number>
  deposits: SeededDeposit[]
  hub: GridPos
  starterBelts: SeededBelt[]
  starterMiners: SeededMiner[]
  starterInventory: Partial<Inventory>
}

const ORES_BY_VALLEY: Record<number, OreType[]> = {
  1: ['iron', 'copper', 'coal'],
  2: ['silica', 'aluminum'],
  3: ['titanium', 'lithium'],
  4: ['tungsten', 'thorium'],
}

const DEFAULT_ORES: OreType[] = ['iron', 'copper', 'coal']

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function randomIntInRange(rng: () => number, min: number, max: number): number {
  if (max <= min) return min
  return min + Math.floor(rng() * (max - min + 1))
}

function randomFloatInRange(rng: () => number, min: number, max: number): number {
  if (max <= min) return min
  return min + rng() * (max - min)
}

function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7
  const u = h < 4 ? x : y
  const v = h < 4 ? y : x
  const first = (h & 1) === 0 ? u : -u
  const second = (h & 2) === 0 ? v : -v
  return first + second
}

function createPerlinPermutation(seed: number): number[] {
  const rng = mulberry32(seed ^ 0x9e3779b9)
  const values = Array.from({ length: 256 }, (_, index) => index)
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const temp = values[index]
    values[index] = values[swapIndex]
    values[swapIndex] = temp
  }
  return [...values, ...values]
}

function perlin2(permutation: number[], x: number, y: number): number {
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const u = fade(xf)
  const v = fade(yf)

  const aa = permutation[permutation[xi] + yi]
  const ab = permutation[permutation[xi] + yi + 1]
  const ba = permutation[permutation[xi + 1] + yi]
  const bb = permutation[permutation[xi + 1] + yi + 1]

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
  return lerp(x1, x2, v)
}

function fbmNoise(
  permutation: number[],
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
): number {
  let amplitude = 1
  let frequency = 1
  let sum = 0
  let amplitudeSum = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += perlin2(permutation, x * frequency, y * frequency) * amplitude
    amplitudeSum += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  if (amplitudeSum <= 0) return 0
  return sum / amplitudeSum
}

function nearestTerrainCell(terrain: TerrainMap, origin: GridPos): GridPos {
  for (let radius = 0; radius <= 24; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        if (terrain[cellKey(x, y)] !== undefined) return { x, y }
      }
    }
  }
  return origin
}

function forceLand(terrain: TerrainMap, x: number, y: number, valley: number): void {
  const key = cellKey(x, y)
  const existing = terrain[key]
  if (existing === undefined || valley < existing) {
    terrain[key] = valley
  }
}

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

function sampleMajorCenter(config: WorldgenValleyConfig, rng: () => number): GridPos {
  return {
    x: config.majorAnchor.x + Math.round((rng() - 0.5) * 2 * config.majorSpread.x),
    y: config.majorAnchor.y + Math.round((rng() - 0.5) * 2 * config.majorSpread.y),
  }
}

function sampleSatelliteCenter(
  major: GeneratedIsland,
  config: WorldgenValleyConfig,
  rng: () => number,
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

function manhattanBelts(from: GridPos, to: GridPos, horizontalFirst: boolean): SeededBelt[] {
  const belts: SeededBelt[] = []
  let x = from.x
  let y = from.y
  const pushHorizontal = () => {
    while (x !== to.x) {
      const dir: Direction = x < to.x ? 'right' : 'left'
      x += x < to.x ? 1 : -1
      if (x === to.x && y === to.y) break
      belts.push({ x, y, dir })
    }
  }
  const pushVertical = () => {
    while (y !== to.y) {
      const dir: Direction = y < to.y ? 'down' : 'up'
      y += y < to.y ? 1 : -1
      if (x === to.x && y === to.y) break
      belts.push({ x, y, dir })
    }
  }
  if (horizontalFirst) {
    pushHorizontal()
    pushVertical()
  } else {
    pushVertical()
    pushHorizontal()
  }
  return belts
}

function chooseValleyCellNear(
  terrain: TerrainMap,
  valleyCells: Record<number, GridPos[]>,
  valley: number,
  origin: GridPos,
  radius: number,
  rng: () => number,
): GridPos {
  const nearby: GridPos[] = []
  for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
    for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
      if (terrain[cellKey(x, y)] !== valley) continue
      nearby.push({ x, y })
    }
  }

  if (nearby.length > 0) {
    return nearby[Math.floor(rng() * nearby.length)] ?? origin
  }

  const fallbackCells = valleyCells[valley] ?? []
  if (fallbackCells.length > 0) {
    return fallbackCells[Math.floor(rng() * fallbackCells.length)] ?? origin
  }
  return origin
}

export function generateSeededWorld(seed: number): SeededWorld {
  const rng = mulberry32(seed)
  const terrain: TerrainMap = {}
  const bridgeSlots: Record<string, number> = {}
  const deposits: SeededDeposit[] = []
  const starterBelts: SeededBelt[] = []
  const starterMiners: SeededMiner[] = []
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

  const shape = WORLDGEN_CONFIG.islandShape
  const macroPermutation = createPerlinPermutation(seed ^ 0x1f123bb5)
  const detailPermutation = createPerlinPermutation(seed ^ 0xa84f3c9d)

  for (const island of allIslands) {
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
          fbmNoise(
            detailPermutation,
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
          fbmNoise(
            detailPermutation,
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

        const macroNoise = fbmNoise(
          macroPermutation,
          sampleX * shape.baseFrequency,
          sampleY * shape.baseFrequency,
          shape.octaves,
          shape.persistence,
          shape.lacunarity,
        )
        const detailNoise = fbmNoise(
          detailPermutation,
          (sampleX + island.id * 7.13) * shape.detailFrequency,
          (sampleY - island.id * 5.61) * shape.detailFrequency,
          Math.max(2, shape.octaves - 1),
          shape.persistence * 0.92,
          shape.lacunarity,
        )

        const angle = Math.atan2(dy, dx)
        const ripple =
          Math.sin(angle * shape.rippleFrequency + macroNoise * 2.4 + island.id * 0.63) *
          shape.rippleAmplitude
        const radialNoise = 1 + macroNoise * shape.coastAmplitude + detailNoise * shape.detailAmplitude + ripple
        const centerBias = 1 - Math.min(1, dist / Math.max(1, island.radius * 0.6))
        const edgeRadius = island.radius * Math.max(0.45, radialNoise + centerBias * 0.32)

        if (dist <= edgeRadius) {
          forceLand(terrain, x, y, island.valley)
        }
      }
    }
  }

  const valleyCells: Record<number, GridPos[]> = {}
  for (const [key, valley] of Object.entries(terrain)) {
    const [x, y] = key.split(',').map(Number)
    if (!valleyCells[valley]) valleyCells[valley] = []
    valleyCells[valley].push({ x, y })
  }

  const oreConfig = WORLDGEN_CONFIG.oreClusters
  const addCluster = (origin: GridPos, ore: OreType, baseRichness: number, radius: number) => {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        const valley = terrain[cellKey(x, y)]
        if (valley === undefined) continue
        const dist = Math.hypot(x - origin.x, y - origin.y)
        if (dist > radius + 0.35) continue
        const variation = (rng() - 0.5) * oreConfig.falloffPerTile * 0.4
        const richness = Math.max(
          oreConfig.minRichnessPerTile,
          Math.round(baseRichness - dist * oreConfig.falloffPerTile + variation),
        )
        deposits.push({ x, y, ore, richness })
      }
    }
  }

  for (const island of majorIslands) {
    const ores = ORES_BY_VALLEY[island.valley] ?? DEFAULT_ORES
    for (const ore of ores) {
      for (let clusterIndex = 0; clusterIndex < oreConfig.majorClustersPerOre; clusterIndex += 1) {
        const origin = chooseValleyCellNear(
          terrain,
          valleyCells,
          island.valley,
          island.center,
          Math.max(10, Math.round(island.radius * 0.9)),
          rng,
        )
        addCluster(
          origin,
          ore,
          randomIntInRange(rng, oreConfig.majorRichnessMin, oreConfig.majorRichnessMax),
          oreConfig.majorClusterRadius,
        )
      }

      if (rng() < oreConfig.majorBonusChance) {
        const origin = chooseValleyCellNear(
          terrain,
          valleyCells,
          island.valley,
          island.center,
          Math.max(10, Math.round(island.radius * 0.95)),
          rng,
        )
        addCluster(
          origin,
          ore,
          randomIntInRange(rng, oreConfig.majorBonusRichnessMin, oreConfig.majorBonusRichnessMax),
          oreConfig.majorClusterRadius,
        )
      }
    }
  }

  for (const island of satelliteIslands) {
    if (rng() >= oreConfig.satelliteSpawnChance) continue
    const ores = ORES_BY_VALLEY[island.valley] ?? DEFAULT_ORES
    const ore = ores[Math.floor(rng() * ores.length)] ?? DEFAULT_ORES[0]
    addCluster(
      island.center,
      ore,
      randomIntInRange(rng, oreConfig.satelliteRichnessMin, oreConfig.satelliteRichnessMax),
      oreConfig.satelliteClusterRadius,
    )
  }

  const starterAnchor =
    majorIslands.find((island) => island.valley === 1)?.center ??
    majorIslands[0]?.center ??
    allIslands[0].center
  const hub = nearestTerrainCell(terrain, starterAnchor)
  const starterConfig = WORLDGEN_CONFIG.starter
  const starterValley = terrain[cellKey(hub.x, hub.y)] ?? 1
  const guaranteedStartRichness = Math.max(oreConfig.majorRichnessMax, 20_000)

  for (const start of starterConfig.guaranteedStarts) {
    const startPos = {
      x: hub.x + start.offset.x,
      y: hub.y + start.offset.y,
    }
    forceLand(terrain, startPos.x, startPos.y, starterValley)
    addCluster(startPos, start.ore, guaranteedStartRichness, oreConfig.majorClusterRadius)
    starterMiners.push({
      x: startPos.x,
      y: startPos.y,
      dir: start.dir,
      kind: 'miner',
    })

    const startCell = {
      x: startPos.x + (start.dir === 'right' ? 1 : start.dir === 'left' ? -1 : 0),
      y: startPos.y + (start.dir === 'down' ? 1 : start.dir === 'up' ? -1 : 0),
    }
    const path = manhattanBelts(startCell, hub, start.dir === 'right' || start.dir === 'left')
    starterBelts.push(...path)
  }

  for (
    let x = hub.x - starterConfig.hubRingHalfWidth;
    x <= hub.x + starterConfig.hubRingHalfWidth;
    x += 1
  ) {
    forceLand(terrain, x, hub.y - starterConfig.hubRingHalfHeight, starterValley)
    forceLand(terrain, x, hub.y + starterConfig.hubRingHalfHeight, starterValley)
    starterBelts.push({ x, y: hub.y - starterConfig.hubRingHalfHeight, dir: 'right' })
    starterBelts.push({ x, y: hub.y + starterConfig.hubRingHalfHeight, dir: 'left' })
  }

  for (
    let y = hub.y - starterConfig.hubRingHalfHeight;
    y <= hub.y + starterConfig.hubRingHalfHeight;
    y += 1
  ) {
    forceLand(terrain, hub.x - starterConfig.hubRingHalfWidth, y, starterValley)
    forceLand(terrain, hub.x + starterConfig.hubRingHalfWidth, y, starterValley)
    starterBelts.push({ x: hub.x - starterConfig.hubRingHalfWidth, y, dir: 'down' })
    starterBelts.push({ x: hub.x + starterConfig.hubRingHalfWidth, y, dir: 'up' })
  }

  return {
    terrain,
    bridgeSlots,
    deposits,
    hub,
    starterBelts,
    starterMiners,
    starterInventory: { ...starterConfig.starterInventory },
  }
}
