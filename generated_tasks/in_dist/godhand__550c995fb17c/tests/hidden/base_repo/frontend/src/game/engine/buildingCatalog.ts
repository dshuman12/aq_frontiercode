import rawBuildingData from '../data/buildingData.json'
import { BUILDABLE_IDS, type BuildableId } from './types'

type RawBuildColor = {
  fill: string
  stroke: string
}

type RawBuildCategory = {
  id: string
  label: string
  color: RawBuildColor
}

type RawBuildingDefinition = {
  id: string
  label: string
  category: string
  color: RawBuildColor
  description?: string
  details?: string[]
  components: string[]
  footprint?: {
    width: number
    height: number
  }
  bridgeTier?: number
  minerKind?: 'miner' | 'drill'
  minerCycleSec?: number
  processingCycleSec?: number
  defaultUnlocked?: boolean
}

type RawBuildingData = {
  categories: RawBuildCategory[]
  buildings: RawBuildingDefinition[]
}

export type BuildColor = {
  fill: string
  stroke: string
}

export type BuildComponent =
  | 'path_placeable'
  | 'land_placeable'
  | 'void_placeable'
  | 'directional'
  | 'belt'
  | 'miner'
  | 'processor'
  | 'bridge'
  | 'storage_provider'
  | 'depot_input'
  | 'depot_output'

export type BuildPlacementSurface = 'path' | 'land' | 'void'

export type BuildCategoryId = string

export type BuildItemDefinition = {
  id: BuildableId
  label: string
}

export type BuildCategoryDefinition = {
  id: BuildCategoryId
  label: string
  color: BuildColor
  items: BuildItemDefinition[]
}

export type BuildDefinition = {
  id: BuildableId
  label: string
  category: BuildCategoryId
  color: BuildColor
  description: string
  details: string[]
  components: readonly BuildComponent[]
  footprint: {
    width: number
    height: number
  }
  bridgeTier: number
  minerKind: 'miner' | 'drill' | null
  minerCycleSec: number | null
  processingCycleSec: number | null
  defaultUnlocked: boolean
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid building catalog: expected non-empty string for ${field}.`)
  }
  return value.trim()
}

function assertHexLikeColor(value: unknown, field: string): string {
  const color = assertNonEmptyString(value, field)
  if (color[0] !== '#') {
    throw new Error(`Invalid building catalog: ${field} must start with '#'.`)
  }
  return color
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid building catalog: expected positive integer for ${field}.`)
  }
  return value
}

function assertPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid building catalog: expected positive number for ${field}.`)
  }
  return value
}

const BUILD_COMPONENTS = [
  'path_placeable',
  'land_placeable',
  'void_placeable',
  'directional',
  'belt',
  'miner',
  'processor',
  'bridge',
  'storage_provider',
  'depot_input',
  'depot_output',
] as const satisfies readonly BuildComponent[]

const BUILD_COMPONENT_SET = new Set<string>(BUILD_COMPONENTS)

function parseBuildingCatalog(input: unknown): {
  categories: BuildCategoryDefinition[]
  byId: Record<BuildableId, BuildDefinition>
} {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid building catalog: expected object at root.')
  }

  const candidate = input as Partial<RawBuildingData>
  if (!Array.isArray(candidate.categories)) {
    throw new Error('Invalid building catalog: categories must be an array.')
  }
  if (!Array.isArray(candidate.buildings)) {
    throw new Error('Invalid building catalog: buildings must be an array.')
  }

  const categories: BuildCategoryDefinition[] = []
  const categoriesById = new Map<string, BuildCategoryDefinition>()
  for (let index = 0; index < candidate.categories.length; index += 1) {
    const entry = candidate.categories[index]
    const id = assertNonEmptyString(entry?.id, `categories[${index}].id`)
    if (categoriesById.has(id)) {
      throw new Error(`Invalid building catalog: duplicate category id "${id}".`)
    }
    const parsed: BuildCategoryDefinition = {
      id,
      label: assertNonEmptyString(entry?.label, `categories[${index}].label`),
      color: {
        fill: assertHexLikeColor(entry?.color?.fill, `categories[${index}].color.fill`),
        stroke: assertHexLikeColor(entry?.color?.stroke, `categories[${index}].color.stroke`),
      },
      items: [],
    }
    categories.push(parsed)
    categoriesById.set(id, parsed)
  }

  const knownBuildIds = new Set<string>(BUILDABLE_IDS as readonly string[])
  const byId = {} as Record<BuildableId, BuildDefinition>
  const seenBuildIds = new Set<string>()

  for (let index = 0; index < candidate.buildings.length; index += 1) {
    const entry = candidate.buildings[index]
    const id = assertNonEmptyString(entry?.id, `buildings[${index}].id`)
    if (!knownBuildIds.has(id)) {
      throw new Error(`Invalid building catalog: unknown build id "${id}".`)
    }
    if (seenBuildIds.has(id)) {
      throw new Error(`Invalid building catalog: duplicate build id "${id}".`)
    }
    seenBuildIds.add(id)

    const categoryId = assertNonEmptyString(entry?.category, `buildings[${index}].category`)
    const category = categoriesById.get(categoryId)
    if (!category) {
      throw new Error(`Invalid building catalog: build "${id}" references unknown category "${categoryId}".`)
    }

    if (!Array.isArray(entry?.components)) {
      throw new Error(`Invalid building catalog: build "${id}" components must be an array.`)
    }
    if (entry.components.length === 0) {
      throw new Error(`Invalid building catalog: build "${id}" must define at least one component.`)
    }
    const componentSet = new Set<string>()
    const components: BuildComponent[] = []
    for (let componentIndex = 0; componentIndex < entry.components.length; componentIndex += 1) {
      const component = assertNonEmptyString(
        entry.components[componentIndex],
        `buildings[${index}].components[${componentIndex}]`,
      )
      if (!BUILD_COMPONENT_SET.has(component)) {
        throw new Error(`Invalid building catalog: build "${id}" has unknown component "${component}".`)
      }
      if (componentSet.has(component)) continue
      componentSet.add(component)
      components.push(component as BuildComponent)
    }

    const footprint = entry.footprint
      ? {
          width: assertPositiveInteger(entry.footprint.width, `buildings[${index}].footprint.width`),
          height: assertPositiveInteger(entry.footprint.height, `buildings[${index}].footprint.height`),
        }
      : { width: 1, height: 1 }

    const bridgeTierRaw = entry.bridgeTier
    const bridgeTier =
      bridgeTierRaw === undefined
        ? 0
        : assertPositiveInteger(bridgeTierRaw, `buildings[${index}].bridgeTier`)
    if (componentSet.has('bridge') && bridgeTier <= 0) {
      throw new Error(`Invalid building catalog: bridge build "${id}" must define bridgeTier.`)
    }
    if (!componentSet.has('bridge') && bridgeTier > 0) {
      throw new Error(`Invalid building catalog: non-bridge build "${id}" cannot define bridgeTier.`)
    }

    let minerKind: 'miner' | 'drill' | null = null
    if (entry.minerKind !== undefined) {
      if (entry.minerKind !== 'miner' && entry.minerKind !== 'drill') {
        throw new Error(`Invalid building catalog: build "${id}" has invalid minerKind.`)
      }
      minerKind = entry.minerKind
    }
    const minerCycleSec =
      entry.minerCycleSec === undefined
        ? null
        : assertPositiveNumber(entry.minerCycleSec, `buildings[${index}].minerCycleSec`)
    if (componentSet.has('miner') && (!minerKind || minerCycleSec === null)) {
      throw new Error(`Invalid building catalog: miner build "${id}" must define minerKind and minerCycleSec.`)
    }
    if (!componentSet.has('miner') && (minerKind || minerCycleSec !== null)) {
      throw new Error(`Invalid building catalog: non-miner build "${id}" cannot define miner properties.`)
    }

    const processingCycleSec =
      entry.processingCycleSec === undefined
        ? null
        : assertPositiveNumber(entry.processingCycleSec, `buildings[${index}].processingCycleSec`)
    if (componentSet.has('processor') && processingCycleSec === null) {
      throw new Error(`Invalid building catalog: processor build "${id}" must define processingCycleSec.`)
    }
    if (!componentSet.has('processor') && processingCycleSec !== null) {
      throw new Error(
        `Invalid building catalog: non-processor build "${id}" cannot define processingCycleSec.`,
      )
    }

    const parsed: BuildDefinition = {
      id: id as BuildableId,
      label: assertNonEmptyString(entry?.label, `buildings[${index}].label`),
      category: categoryId,
      color: {
        fill: assertHexLikeColor(entry?.color?.fill, `buildings[${index}].color.fill`),
        stroke: assertHexLikeColor(entry?.color?.stroke, `buildings[${index}].color.stroke`),
      },
      description:
        typeof entry?.description === 'string' && entry.description.trim().length > 0
          ? entry.description.trim()
          : `No description configured for ${id}.`,
      details: Array.isArray(entry?.details)
        ? entry.details
            .filter((detail): detail is string => typeof detail === 'string')
            .map((detail) => detail.trim())
            .filter((detail) => detail.length > 0)
        : [],
      components,
      footprint,
      bridgeTier,
      minerKind,
      minerCycleSec,
      processingCycleSec,
      defaultUnlocked: entry.defaultUnlocked === true,
    }

    byId[id as BuildableId] = parsed
    category.items.push({ id: parsed.id, label: parsed.label })
  }

  for (const buildId of BUILDABLE_IDS) {
    if (!seenBuildIds.has(buildId)) {
      throw new Error(`Invalid building catalog: missing build definition "${buildId}".`)
    }
  }

  return { categories, byId }
}

const parsedCatalog = parseBuildingCatalog(rawBuildingData)

export const BUILD_DEFINITIONS = parsedCatalog.byId

export const BUILD_COLORS: Record<BuildableId, BuildColor> = BUILDABLE_IDS.reduce(
  (acc, buildId) => {
    acc[buildId] = BUILD_DEFINITIONS[buildId].color
    return acc
  },
  {} as Record<BuildableId, BuildColor>,
)

export const BUILD_CATEGORIES: BuildCategoryDefinition[] = parsedCatalog.categories

export const CATEGORY_COLORS: Record<BuildCategoryId, BuildColor> = parsedCatalog.categories.reduce(
  (acc, category) => {
    acc[category.id] = category.color
    return acc
  },
  {} as Record<BuildCategoryId, BuildColor>,
)

const BUILD_COMPONENTS_BY_ID: Record<BuildableId, Set<BuildComponent>> = BUILDABLE_IDS.reduce(
  (acc, buildId) => {
    acc[buildId] = new Set(BUILD_DEFINITIONS[buildId].components)
    return acc
  },
  {} as Record<BuildableId, Set<BuildComponent>>,
)

const PROCESSING_BUILD_IDS = BUILDABLE_IDS.filter((buildId) => hasBuildComponent(buildId, 'processor'))
const DIRECTIONAL_BUILD_IDS = BUILDABLE_IDS.filter((buildId) => hasBuildComponent(buildId, 'directional'))

export function hasBuildComponent(buildId: BuildableId, component: BuildComponent): boolean {
  return BUILD_COMPONENTS_BY_ID[buildId].has(component)
}

export function getBuildFootprint(buildId: BuildableId): { width: number; height: number } {
  return BUILD_DEFINITIONS[buildId].footprint
}

export function getBuildPlacementSurface(buildId: BuildableId): BuildPlacementSurface {
  if (hasBuildComponent(buildId, 'path_placeable')) return 'path'
  if (hasBuildComponent(buildId, 'void_placeable')) return 'void'
  return 'land'
}

export function isBuildDirectional(buildId: BuildableId): boolean {
  return DIRECTIONAL_BUILD_IDS.includes(buildId)
}

export function isProcessingBuildId(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'processor')
}

export function getProcessingBuildIds(): BuildableId[] {
  return [...PROCESSING_BUILD_IDS]
}

export function getProcessingCycleSec(buildId: BuildableId): number | null {
  return BUILD_DEFINITIONS[buildId].processingCycleSec
}

export function isBeltBuildId(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'belt')
}

export function isMinerBuildId(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'miner')
}

export function getMinerBuildKind(buildId: BuildableId): 'miner' | 'drill' | null {
  return BUILD_DEFINITIONS[buildId].minerKind
}

export function getMinerCycleSec(buildId: BuildableId): number | null {
  return BUILD_DEFINITIONS[buildId].minerCycleSec
}

export function isBridgeBuildId(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'bridge')
}

export function getBridgeTierForBuild(buildId: BuildableId): number {
  return BUILD_DEFINITIONS[buildId].bridgeTier
}

export function providesStorage(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'storage_provider')
}

export function isDepotInputBuildId(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'depot_input')
}

export function isDepotOutputBuildId(buildId: BuildableId): boolean {
  return hasBuildComponent(buildId, 'depot_output')
}

export function isBuildDefaultUnlocked(buildId: BuildableId): boolean {
  return BUILD_DEFINITIONS[buildId].defaultUnlocked
}
