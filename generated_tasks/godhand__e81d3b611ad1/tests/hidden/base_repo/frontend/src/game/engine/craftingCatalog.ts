import rawCraftingData from '../data/craftingData.json'
import {
  BUILDABLE_IDS,
  ORE_TYPES,
  type BuildableId,
  type CraftRecipeId,
  type CraftingStationId,
  type MaterialType,
  type ResourceCost,
  type UnlockState,
} from './types'

type RawMaterialDefinition = {
  id: string
  label: string
}

type RawCraftingStationDefinition = {
  id: string
  label: string
}

type RawRecipeDefinition = {
  id: string
  label: string
  output: {
    material: string
    amount: number
  }
  cost: Record<string, number>
  valley: number
  station: string
  manualTimeSec?: number
}

type RawCraftingData = {
  materials: RawMaterialDefinition[]
  stations: RawCraftingStationDefinition[]
  recipes: RawRecipeDefinition[]
}

export type MaterialDefinition = {
  id: MaterialType
  label: string
}

export type CraftingStationDefinition = {
  id: CraftingStationId
  label: string
}

export type CraftRecipeDefinition = {
  id: CraftRecipeId
  label: string
  output: { material: MaterialType; amount: number }
  cost: ResourceCost
  valley: number
  station: CraftingStationId
  manualTimeSec?: number
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid crafting catalog: expected non-empty string for ${field}.`)
  }
  return value.trim()
}

function assertPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid crafting catalog: expected positive number for ${field}.`)
  }
  return value
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid crafting catalog: expected positive integer for ${field}.`)
  }
  return value
}

function parseCraftingCatalog(input: unknown): {
  materials: MaterialDefinition[]
  stations: CraftingStationDefinition[]
  recipes: CraftRecipeDefinition[]
} {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid crafting catalog: expected object at root.')
  }

  const candidate = input as Partial<RawCraftingData>
  if (!Array.isArray(candidate.materials)) {
    throw new Error('Invalid crafting catalog: materials must be an array.')
  }
  if (!Array.isArray(candidate.stations)) {
    throw new Error('Invalid crafting catalog: stations must be an array.')
  }
  if (!Array.isArray(candidate.recipes)) {
    throw new Error('Invalid crafting catalog: recipes must be an array.')
  }

  const materials: MaterialDefinition[] = []
  const materialSet = new Set<string>()
  for (let index = 0; index < candidate.materials.length; index += 1) {
    const entry = candidate.materials[index]
    const id = assertNonEmptyString(entry?.id, `materials[${index}].id`)
    if (materialSet.has(id)) {
      throw new Error(`Invalid crafting catalog: duplicate material id "${id}".`)
    }
    materialSet.add(id)
    materials.push({
      id,
      label: assertNonEmptyString(entry?.label, `materials[${index}].label`),
    })
  }

  const validStations = new Set<string>(['manual', ...(BUILDABLE_IDS as readonly string[])])
  const stations: CraftingStationDefinition[] = []
  const stationSet = new Set<string>()
  for (let index = 0; index < candidate.stations.length; index += 1) {
    const entry = candidate.stations[index]
    const id = assertNonEmptyString(entry?.id, `stations[${index}].id`)
    if (!validStations.has(id)) {
      throw new Error(
        `Invalid crafting catalog: station "${id}" is not "manual" or a known building id.`,
      )
    }
    if (stationSet.has(id)) {
      throw new Error(`Invalid crafting catalog: duplicate station id "${id}".`)
    }
    stationSet.add(id)
    stations.push({
      id: id as CraftingStationId,
      label: assertNonEmptyString(entry?.label, `stations[${index}].label`),
    })
  }

  const resourceSet = new Set<string>([...(ORE_TYPES as readonly string[]), ...materialSet])
  const recipes: CraftRecipeDefinition[] = []
  const recipeSet = new Set<string>()
  for (let index = 0; index < candidate.recipes.length; index += 1) {
    const entry = candidate.recipes[index]
    const id = assertNonEmptyString(entry?.id, `recipes[${index}].id`)
    if (recipeSet.has(id)) {
      throw new Error(`Invalid crafting catalog: duplicate recipe id "${id}".`)
    }
    recipeSet.add(id)

    const station = assertNonEmptyString(entry?.station, `recipes[${index}].station`)
    if (!stationSet.has(station)) {
      throw new Error(
        `Invalid crafting catalog: recipe "${id}" references unknown station "${station}".`,
      )
    }

    const outputMaterial = assertNonEmptyString(
      entry?.output?.material,
      `recipes[${index}].output.material`,
    )
    if (!materialSet.has(outputMaterial)) {
      throw new Error(
        `Invalid crafting catalog: recipe "${id}" output material "${outputMaterial}" is not declared.`,
      )
    }

    const outputAmount = assertPositiveNumber(entry?.output?.amount, `recipes[${index}].output.amount`)
    const valley = assertPositiveInteger(entry?.valley, `recipes[${index}].valley`)
    const manualTimeSec =
      entry?.manualTimeSec === undefined
        ? undefined
        : assertPositiveNumber(entry.manualTimeSec, `recipes[${index}].manualTimeSec`)

    const costInput = entry?.cost
    if (!costInput || typeof costInput !== 'object' || Array.isArray(costInput)) {
      throw new Error(`Invalid crafting catalog: recipe "${id}" cost must be an object.`)
    }

    const costEntries = Object.entries(costInput)
    if (costEntries.length === 0) {
      throw new Error(`Invalid crafting catalog: recipe "${id}" must define at least one ingredient.`)
    }

    const normalizedCost: ResourceCost = {}
    for (const [resourceId, amount] of costEntries) {
      if (!resourceSet.has(resourceId)) {
        throw new Error(
          `Invalid crafting catalog: recipe "${id}" ingredient "${resourceId}" is not a known ore/material.`,
        )
      }
      normalizedCost[resourceId] = assertPositiveNumber(
        amount,
        `recipes[${index}].cost.${resourceId}`,
      )
    }

    recipes.push({
      id,
      label: assertNonEmptyString(entry?.label, `recipes[${index}].label`),
      output: { material: outputMaterial, amount: outputAmount },
      cost: normalizedCost,
      valley,
      station: station as CraftingStationId,
      manualTimeSec,
    })
  }

  for (const material of materials) {
    const hasProcessingRecipe = recipes.some(
      (recipe) => recipe.output.material === material.id && recipe.station !== 'manual',
    )
    if (!hasProcessingRecipe) {
      throw new Error(
        `Invalid crafting catalog: material "${material.id}" must have at least one non-manual recipe.`,
      )
    }
  }

  return {
    materials,
    stations,
    recipes,
  }
}

const parsedCatalog = parseCraftingCatalog(rawCraftingData)

export const MATERIAL_TYPES: MaterialType[] = parsedCatalog.materials.map((material) => material.id)

export const MATERIAL_LABELS: Record<MaterialType, string> = parsedCatalog.materials.reduce(
  (acc, material) => {
    acc[material.id] = material.label
    return acc
  },
  {} as Record<MaterialType, string>,
)

export const CRAFTING_STATIONS: Record<string, CraftingStationDefinition> = parsedCatalog.stations.reduce(
  (acc, station) => {
    acc[station.id] = station
    return acc
  },
  {} as Record<string, CraftingStationDefinition>,
)

export const CRAFT_RECIPES: Record<CraftRecipeId, CraftRecipeDefinition> = parsedCatalog.recipes.reduce(
  (acc, recipe) => {
    acc[recipe.id] = recipe
    return acc
  },
  {} as Record<CraftRecipeId, CraftRecipeDefinition>,
)

export function getCraftingStationLabel(stationId: CraftingStationId): string {
  return CRAFTING_STATIONS[stationId]?.label ?? stationId
}

export function isCraftingStationAvailable(
  unlocked: UnlockState,
  stationId: CraftingStationId,
): boolean {
  return stationId === 'manual' || Boolean(unlocked[stationId as BuildableId])
}
