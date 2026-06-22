import type { BuildableId } from '../../game/engine'
import {
  BUILD_CATEGORIES as ENGINE_BUILD_CATEGORIES,
  BUILD_COLORS as ENGINE_BUILD_COLORS,
  CATEGORY_COLORS as ENGINE_CATEGORY_COLORS,
  type BuildCategoryDefinition as EngineBuildCategoryDefinition,
  type BuildColor,
} from '../../game/engine/buildingCatalog'

export type BuildId = BuildableId
export type BuildCategoryId = string

export type BuildItem = {
  id: BuildId
  label: string
}

export type BuildCategory = {
  id: BuildCategoryId
  label: string
  items: BuildItem[]
}

export const BUILD_COLORS: Record<BuildId, BuildColor> = ENGINE_BUILD_COLORS
export const CATEGORY_COLORS: Record<BuildCategoryId, BuildColor> = ENGINE_CATEGORY_COLORS

function toBuildCategory(definition: EngineBuildCategoryDefinition): BuildCategory {
  return {
    id: definition.id,
    label: definition.label,
    items: definition.items.map((item) => ({ id: item.id, label: item.label })),
  }
}

export const BUILD_CATEGORIES: BuildCategory[] = ENGINE_BUILD_CATEGORIES.map(toBuildCategory)
