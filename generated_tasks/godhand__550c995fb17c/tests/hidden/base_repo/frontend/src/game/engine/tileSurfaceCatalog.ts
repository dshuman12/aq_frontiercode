import type { BuildableId, GameState } from './types'
import { getBuildPlacementSurface, type BuildPlacementSurface } from './buildingCatalog'
import { isLandCell, isTraversableCell } from './state'

type SurfaceMatcher = (state: GameState, x: number, y: number, maxBridgeTier: number) => boolean

export type TileSurfaceRule = {
  id: BuildPlacementSurface
  failureReason: string
  matches: SurfaceMatcher
}

const SURFACE_MATCHERS: Record<BuildPlacementSurface, SurfaceMatcher> = {
  path: (state, x, y, maxBridgeTier) => isTraversableCell(state, x, y, maxBridgeTier),
  land: (state, x, y) => isLandCell(state, x, y),
  void: (state, x, y) => !isLandCell(state, x, y),
}

const SURFACE_FAILURE_REASONS: Record<BuildPlacementSurface, string> = {
  path: 'requires path tile!',
  land: 'cannot place on void!',
  void: 'cannot place on land!',
}

export const TILE_SURFACE_RULES: Record<BuildPlacementSurface, TileSurfaceRule> = {
  path: {
    id: 'path',
    failureReason: SURFACE_FAILURE_REASONS.path,
    matches: SURFACE_MATCHERS.path,
  },
  land: {
    id: 'land',
    failureReason: SURFACE_FAILURE_REASONS.land,
    matches: SURFACE_MATCHERS.land,
  },
  void: {
    id: 'void',
    failureReason: SURFACE_FAILURE_REASONS.void,
    matches: SURFACE_MATCHERS.void,
  },
}

export function matchesBuildPlacementSurface(
  state: GameState,
  x: number,
  y: number,
  buildId: BuildableId,
  maxBridgeTier: number,
): boolean {
  const rule = TILE_SURFACE_RULES[getBuildPlacementSurface(buildId)]
  return rule.matches(state, x, y, maxBridgeTier)
}

export function getBuildPlacementSurfaceFailureReason(buildId: BuildableId): string {
  return TILE_SURFACE_RULES[getBuildPlacementSurface(buildId)].failureReason
}
