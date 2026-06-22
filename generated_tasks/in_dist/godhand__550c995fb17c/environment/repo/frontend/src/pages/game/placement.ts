import type { BuildId } from './buildCatalog'

export type PlacementIntent = {
  enabled: boolean
  selectedBuildId: BuildId | null
}

export function canPlace(intent: PlacementIntent): intent is {
  enabled: true
  selectedBuildId: BuildId
} {
  return intent.enabled && intent.selectedBuildId !== null
}
