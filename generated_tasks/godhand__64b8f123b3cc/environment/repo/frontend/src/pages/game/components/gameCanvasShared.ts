import {
  BUILDABLE_IDS,
  CRAFT_RECIPES,
  MATERIAL_TYPES,
  ORE_TYPES,
  type CraftRecipeId,
  type Direction,
  type OreType,
  type ProcessingStatus,
} from '../../../game/engine'
import {
  BUILD_DEFINITIONS,
  getBridgeTierForBuild,
  getProcessingBuildIds,
  isBridgeBuildId,
  isDepotInputBuildId,
  isDepotOutputBuildId,
  isProcessingBuildId,
} from '../../../game/engine/buildingCatalog'
import type { BuildId } from '../buildCatalog'
import { ORE_VISUALS } from '../oreCatalog'

export const DX: Record<Direction, number> = { up: 0, right: 1, down: 0, left: -1 }
export const DY: Record<Direction, number> = { up: -1, right: 0, down: 1, left: 0 }

export const ORE_ITEM_COLORS: Record<OreType, { fill: string; stroke: string }> = ORE_TYPES.reduce(
  (acc, ore) => {
    acc[ore] = { fill: ORE_VISUALS[ore].fill, stroke: ORE_VISUALS[ore].stroke }
    return acc
  },
  {} as Record<OreType, { fill: string; stroke: string }>,
)

export const BELT_CELLS_PER_SECOND = 2
export const PLACEMENT_FEEDBACK_DURATION_MS = 1000
export const TERRAIN_CHUNK_SIZE = 32
export const LOW_DETAIL_CELL_SIZE = 12
export const VERY_LOW_DETAIL_CELL_SIZE = 7
export const HIDE_ITEM_CELL_SIZE = 8
export const CAMERA_NAV_OPTIMIZATION_HOLD_MS = 160
export const MAX_DETAILED_BELTS = 320
export const MAX_DETAILED_MINERS = 120
export const MAX_DETAILED_PROCESSING_STRUCTURES = 90
export const DEBUG_INFINITE_STORAGE_BUILDINGS = 1_000_000

export const KNOWN_RESOURCE_IDS = (() => {
  const ids = new Set<string>()
  for (const ore of ORE_TYPES) ids.add(ore)
  for (const material of MATERIAL_TYPES) ids.add(material)
  for (const recipe of Object.values(CRAFT_RECIPES)) {
    ids.add(recipe.output.material)
    for (const ingredient of Object.keys(recipe.cost)) {
      ids.add(ingredient)
    }
  }
  return ids
})()

export const ORE_RESOURCE_IDS = new Set<string>(ORE_TYPES as readonly string[])

export const BRIDGE_BUILD_BY_TIER: Record<number, BuildId> = BUILDABLE_IDS.reduce(
  (acc, buildId) => {
    if (!isBridgeBuildId(buildId)) return acc
    const tier = getBridgeTierForBuild(buildId)
    if (tier > 0) {
      acc[tier] = buildId
    }
    return acc
  },
  {} as Record<number, BuildId>,
)

const PROCESSING_STATION_IDS: BuildId[] = getProcessingBuildIds() as BuildId[]

export const RECIPES_BY_STATION: Partial<Record<BuildId, CraftRecipeId[]>> = Object.values(CRAFT_RECIPES).reduce(
  (acc, recipe) => {
    const stationIds: BuildId[] =
      recipe.station === 'manual' ? PROCESSING_STATION_IDS : [recipe.station as BuildId]

    for (const stationId of stationIds) {
      const bucket = acc[stationId] ?? []
      bucket.push(recipe.id)
      acc[stationId] = bucket.sort((a, b) => {
        const left = CRAFT_RECIPES[a]
        const right = CRAFT_RECIPES[b]
        if (left.valley !== right.valley) return left.valley - right.valley
        return left.label.localeCompare(right.label)
      })
    }
    return acc
  },
  {} as Partial<Record<BuildId, CraftRecipeId[]>>,
)

export function terrainChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`
}

export function buildLabel(buildId: BuildId): string {
  return BUILD_DEFINITIONS[buildId]?.label ?? buildId
}

export function machineStatusLabel(status: ProcessingStatus): string {
  if (status === 'crafting') return 'running'
  if (status === 'waiting_resources') return 'waiting for ingredients'
  if (status === 'waiting_requirements') return 'waiting for unlock/valley'
  if (status === 'waiting_output') return 'output belt blocked'
  return 'idle'
}

export function isSimulationStructureBuildId(buildId: BuildId): boolean {
  return isProcessingBuildId(buildId) || isDepotInputBuildId(buildId) || isDepotOutputBuildId(buildId)
}
