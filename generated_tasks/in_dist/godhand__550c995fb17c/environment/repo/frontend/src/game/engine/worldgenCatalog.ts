import rawWorldgenData from '../data/worldgenData.json'
import { ORE_TYPES, type Direction, type Inventory, type OreType } from './types'

type RawVector = {
  x: number
  y: number
}

type RawWorldgenData = {
  worldBounds: {
    halfWidth: number
    halfHeight: number
    padding: number
  }
  placement: {
    attemptsPerIsland: number
    minIslandGap: number
  }
  valleys: Array<{
    valley: number
    majorCount: number
    majorRadiusMin: number
    majorRadiusMax: number
    majorAnchor: RawVector
    majorSpread: RawVector
    satelliteCountMin: number
    satelliteCountMax: number
    satelliteRadiusMin: number
    satelliteRadiusMax: number
    satelliteDistanceMin: number
    satelliteDistanceMax: number
    satelliteJitter: number
  }>
  islandShape: {
    baseFrequency: number
    detailFrequency: number
    warpFrequency: number
    warpAmplitude: number
    coastAmplitude: number
    detailAmplitude: number
    rippleAmplitude: number
    rippleFrequency: number
    octaves: number
    persistence: number
    lacunarity: number
  }
  oreClusters: {
    majorClustersPerOre: number
    majorRichnessMin: number
    majorRichnessMax: number
    majorBonusChance: number
    majorBonusRichnessMin: number
    majorBonusRichnessMax: number
    satelliteSpawnChance: number
    satelliteRichnessMin: number
    satelliteRichnessMax: number
    majorClusterRadius: number
    satelliteClusterRadius: number
    falloffPerTile: number
    minRichnessPerTile: number
  }
  starter: {
    guaranteedStarts: Array<{
      ore: string
      offset: RawVector
      dir: string
    }>
    hubRingHalfWidth: number
    hubRingHalfHeight: number
    starterInventory: Record<string, number>
  }
}

export type WorldgenValleyConfig = {
  valley: number
  majorCount: number
  majorRadiusMin: number
  majorRadiusMax: number
  majorAnchor: { x: number; y: number }
  majorSpread: { x: number; y: number }
  satelliteCountMin: number
  satelliteCountMax: number
  satelliteRadiusMin: number
  satelliteRadiusMax: number
  satelliteDistanceMin: number
  satelliteDistanceMax: number
  satelliteJitter: number
}

export type WorldgenConfig = {
  worldBounds: {
    halfWidth: number
    halfHeight: number
    padding: number
  }
  placement: {
    attemptsPerIsland: number
    minIslandGap: number
  }
  valleys: WorldgenValleyConfig[]
  islandShape: {
    baseFrequency: number
    detailFrequency: number
    warpFrequency: number
    warpAmplitude: number
    coastAmplitude: number
    detailAmplitude: number
    rippleAmplitude: number
    rippleFrequency: number
    octaves: number
    persistence: number
    lacunarity: number
  }
  oreClusters: {
    majorClustersPerOre: number
    majorRichnessMin: number
    majorRichnessMax: number
    majorBonusChance: number
    majorBonusRichnessMin: number
    majorBonusRichnessMax: number
    satelliteSpawnChance: number
    satelliteRichnessMin: number
    satelliteRichnessMax: number
    majorClusterRadius: number
    satelliteClusterRadius: number
    falloffPerTile: number
    minRichnessPerTile: number
  }
  starter: {
    guaranteedStarts: Array<{
      ore: OreType
      offset: { x: number; y: number }
      dir: Direction
    }>
    hubRingHalfWidth: number
    hubRingHalfHeight: number
    starterInventory: Partial<Inventory>
  }
}

function assertObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid worldgen config: expected object for ${field}.`)
  }
  return value as Record<string, unknown>
}

function assertInteger(value: unknown, field: string, min?: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Invalid worldgen config: expected integer for ${field}.`)
  }
  if (min !== undefined && value < min) {
    throw new Error(`Invalid worldgen config: expected ${field} >= ${min}.`)
  }
  return value
}

function assertNumber(value: unknown, field: string, min?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid worldgen config: expected number for ${field}.`)
  }
  if (min !== undefined && value < min) {
    throw new Error(`Invalid worldgen config: expected ${field} >= ${min}.`)
  }
  return value
}

function assertChance(value: unknown, field: string): number {
  const parsed = assertNumber(value, field)
  if (parsed < 0 || parsed > 1) {
    throw new Error(`Invalid worldgen config: expected ${field} in [0, 1].`)
  }
  return parsed
}

function parseVector(input: unknown, field: string): { x: number; y: number } {
  const obj = assertObject(input, field)
  return {
    x: assertInteger(obj.x, `${field}.x`),
    y: assertInteger(obj.y, `${field}.y`),
  }
}

function parseWorldgenConfig(input: unknown): WorldgenConfig {
  const root = assertObject(input, 'root') as unknown as Partial<RawWorldgenData>

  const worldBoundsRaw = assertObject(root.worldBounds, 'worldBounds')
  const worldBounds = {
    halfWidth: assertInteger(worldBoundsRaw.halfWidth, 'worldBounds.halfWidth', 80),
    halfHeight: assertInteger(worldBoundsRaw.halfHeight, 'worldBounds.halfHeight', 80),
    padding: assertInteger(worldBoundsRaw.padding, 'worldBounds.padding', 0),
  }
  if (worldBounds.padding * 2 >= worldBounds.halfWidth || worldBounds.padding * 2 >= worldBounds.halfHeight) {
    throw new Error('Invalid worldgen config: worldBounds.padding is too large for world dimensions.')
  }

  const placementRaw = assertObject(root.placement, 'placement')
  const placement = {
    attemptsPerIsland: assertInteger(placementRaw.attemptsPerIsland, 'placement.attemptsPerIsland', 20),
    minIslandGap: assertNumber(placementRaw.minIslandGap, 'placement.minIslandGap', 0),
  }

  if (!Array.isArray(root.valleys) || root.valleys.length === 0) {
    throw new Error('Invalid worldgen config: valleys must be a non-empty array.')
  }

  const valleys: WorldgenValleyConfig[] = []
  const seenValleys = new Set<number>()
  for (let index = 0; index < root.valleys.length; index += 1) {
    const raw = root.valleys[index]
    const valleyId = assertInteger(raw.valley, `valleys[${index}].valley`, 1)
    if (seenValleys.has(valleyId)) {
      throw new Error(`Invalid worldgen config: duplicate valley id ${valleyId}.`)
    }
    seenValleys.add(valleyId)

    const majorRadiusMin = assertInteger(raw.majorRadiusMin, `valleys[${index}].majorRadiusMin`, 8)
    const majorRadiusMax = assertInteger(raw.majorRadiusMax, `valleys[${index}].majorRadiusMax`, 8)
    if (majorRadiusMax < majorRadiusMin) {
      throw new Error(`Invalid worldgen config: valleys[${index}].majorRadiusMax < majorRadiusMin.`)
    }

    const satelliteCountMin = assertInteger(raw.satelliteCountMin, `valleys[${index}].satelliteCountMin`, 0)
    const satelliteCountMax = assertInteger(raw.satelliteCountMax, `valleys[${index}].satelliteCountMax`, 0)
    if (satelliteCountMax < satelliteCountMin) {
      throw new Error(`Invalid worldgen config: valleys[${index}].satelliteCountMax < satelliteCountMin.`)
    }

    const satelliteRadiusMin = assertInteger(raw.satelliteRadiusMin, `valleys[${index}].satelliteRadiusMin`, 1)
    const satelliteRadiusMax = assertInteger(raw.satelliteRadiusMax, `valleys[${index}].satelliteRadiusMax`, 1)
    if (satelliteRadiusMax < satelliteRadiusMin) {
      throw new Error(`Invalid worldgen config: valleys[${index}].satelliteRadiusMax < satelliteRadiusMin.`)
    }

    const satelliteDistanceMin = assertInteger(
      raw.satelliteDistanceMin,
      `valleys[${index}].satelliteDistanceMin`,
      1,
    )
    const satelliteDistanceMax = assertInteger(
      raw.satelliteDistanceMax,
      `valleys[${index}].satelliteDistanceMax`,
      1,
    )
    if (satelliteDistanceMax < satelliteDistanceMin) {
      throw new Error(`Invalid worldgen config: valleys[${index}].satelliteDistanceMax < satelliteDistanceMin.`)
    }

    valleys.push({
      valley: valleyId,
      majorCount: assertInteger(raw.majorCount, `valleys[${index}].majorCount`, 1),
      majorRadiusMin,
      majorRadiusMax,
      majorAnchor: parseVector(raw.majorAnchor, `valleys[${index}].majorAnchor`),
      majorSpread: parseVector(raw.majorSpread, `valleys[${index}].majorSpread`),
      satelliteCountMin,
      satelliteCountMax,
      satelliteRadiusMin,
      satelliteRadiusMax,
      satelliteDistanceMin,
      satelliteDistanceMax,
      satelliteJitter: assertNumber(raw.satelliteJitter, `valleys[${index}].satelliteJitter`, 0),
    })
  }

  valleys.sort((a, b) => a.valley - b.valley)

  const islandShapeRaw = assertObject(root.islandShape, 'islandShape')
  const islandShape = {
    baseFrequency: assertNumber(islandShapeRaw.baseFrequency, 'islandShape.baseFrequency', 0.0001),
    detailFrequency: assertNumber(islandShapeRaw.detailFrequency, 'islandShape.detailFrequency', 0.0001),
    warpFrequency: assertNumber(islandShapeRaw.warpFrequency, 'islandShape.warpFrequency', 0.0001),
    warpAmplitude: assertNumber(islandShapeRaw.warpAmplitude, 'islandShape.warpAmplitude', 0),
    coastAmplitude: assertNumber(islandShapeRaw.coastAmplitude, 'islandShape.coastAmplitude', 0),
    detailAmplitude: assertNumber(islandShapeRaw.detailAmplitude, 'islandShape.detailAmplitude', 0),
    rippleAmplitude: assertNumber(islandShapeRaw.rippleAmplitude, 'islandShape.rippleAmplitude', 0),
    rippleFrequency: assertNumber(islandShapeRaw.rippleFrequency, 'islandShape.rippleFrequency', 0.0001),
    octaves: assertInteger(islandShapeRaw.octaves, 'islandShape.octaves', 1),
    persistence: assertNumber(islandShapeRaw.persistence, 'islandShape.persistence', 0.01),
    lacunarity: assertNumber(islandShapeRaw.lacunarity, 'islandShape.lacunarity', 1),
  }

  const oreClustersRaw = assertObject(root.oreClusters, 'oreClusters')
  const majorRichnessMin = assertInteger(oreClustersRaw.majorRichnessMin, 'oreClusters.majorRichnessMin', 1)
  const majorRichnessMax = assertInteger(oreClustersRaw.majorRichnessMax, 'oreClusters.majorRichnessMax', 1)
  const majorBonusRichnessMin = assertInteger(
    oreClustersRaw.majorBonusRichnessMin,
    'oreClusters.majorBonusRichnessMin',
    1,
  )
  const majorBonusRichnessMax = assertInteger(
    oreClustersRaw.majorBonusRichnessMax,
    'oreClusters.majorBonusRichnessMax',
    1,
  )
  const satelliteRichnessMin = assertInteger(
    oreClustersRaw.satelliteRichnessMin,
    'oreClusters.satelliteRichnessMin',
    1,
  )
  const satelliteRichnessMax = assertInteger(
    oreClustersRaw.satelliteRichnessMax,
    'oreClusters.satelliteRichnessMax',
    1,
  )

  if (majorRichnessMax < majorRichnessMin) {
    throw new Error('Invalid worldgen config: oreClusters.majorRichnessMax < majorRichnessMin.')
  }
  if (majorBonusRichnessMax < majorBonusRichnessMin) {
    throw new Error('Invalid worldgen config: oreClusters.majorBonusRichnessMax < majorBonusRichnessMin.')
  }
  if (satelliteRichnessMax < satelliteRichnessMin) {
    throw new Error('Invalid worldgen config: oreClusters.satelliteRichnessMax < satelliteRichnessMin.')
  }

  const oreClusters = {
    majorClustersPerOre: assertInteger(oreClustersRaw.majorClustersPerOre, 'oreClusters.majorClustersPerOre', 1),
    majorRichnessMin,
    majorRichnessMax,
    majorBonusChance: assertChance(oreClustersRaw.majorBonusChance, 'oreClusters.majorBonusChance'),
    majorBonusRichnessMin,
    majorBonusRichnessMax,
    satelliteSpawnChance: assertChance(oreClustersRaw.satelliteSpawnChance, 'oreClusters.satelliteSpawnChance'),
    satelliteRichnessMin,
    satelliteRichnessMax,
    majorClusterRadius: assertInteger(oreClustersRaw.majorClusterRadius, 'oreClusters.majorClusterRadius', 1),
    satelliteClusterRadius: assertInteger(
      oreClustersRaw.satelliteClusterRadius,
      'oreClusters.satelliteClusterRadius',
      1,
    ),
    falloffPerTile: assertNumber(oreClustersRaw.falloffPerTile, 'oreClusters.falloffPerTile', 0),
    minRichnessPerTile: assertNumber(oreClustersRaw.minRichnessPerTile, 'oreClusters.minRichnessPerTile', 0),
  }

  const starterRaw = assertObject(root.starter, 'starter')
  const guaranteedStartsRaw = starterRaw.guaranteedStarts
  if (!Array.isArray(guaranteedStartsRaw)) {
    throw new Error('Invalid worldgen config: starter.guaranteedStarts must be an array.')
  }

  const validOreIds = new Set<string>(ORE_TYPES)
  const validDirections = new Set<string>(['up', 'right', 'down', 'left'])
  const guaranteedStarts: WorldgenConfig['starter']['guaranteedStarts'] = guaranteedStartsRaw.map(
    (entry, index) => {
      const item = assertObject(entry, `starter.guaranteedStarts[${index}]`)
      const ore = String(item.ore ?? '')
      if (!validOreIds.has(ore)) {
        throw new Error(`Invalid worldgen config: unknown ore "${ore}" in starter.guaranteedStarts[${index}].`)
      }
      const dir = String(item.dir ?? '')
      if (!validDirections.has(dir)) {
        throw new Error(`Invalid worldgen config: invalid direction "${dir}" in starter.guaranteedStarts[${index}].`)
      }
      return {
        ore: ore as OreType,
        offset: parseVector(item.offset, `starter.guaranteedStarts[${index}].offset`),
        dir: dir as Direction,
      }
    },
  )

  const starterInventoryRaw = assertObject(starterRaw.starterInventory, 'starter.starterInventory')
  const starterInventory: Partial<Inventory> = {}
  for (const [resource, amount] of Object.entries(starterInventoryRaw)) {
    if (!validOreIds.has(resource)) {
      throw new Error(`Invalid worldgen config: unknown starter inventory ore "${resource}".`)
    }
    starterInventory[resource as OreType] = assertNumber(amount, `starter.starterInventory.${resource}`, 0)
  }

  return {
    worldBounds,
    placement,
    valleys,
    islandShape,
    oreClusters,
    starter: {
      guaranteedStarts,
      hubRingHalfWidth: assertInteger(starterRaw.hubRingHalfWidth, 'starter.hubRingHalfWidth', 1),
      hubRingHalfHeight: assertInteger(starterRaw.hubRingHalfHeight, 'starter.hubRingHalfHeight', 1),
      starterInventory,
    },
  }
}

export const WORLDGEN_CONFIG = parseWorldgenConfig(rawWorldgenData)
