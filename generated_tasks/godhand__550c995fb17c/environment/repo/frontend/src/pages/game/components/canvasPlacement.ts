import {
  BUILD_COSTS,
  addBelt,
  addMiner,
  buildReachableSet,
  canAffordCost,
  canPlaceBridgeTile,
  clampStateToStorage,
  getBeltAt,
  getHubAt,
  getMinerAt,
  getOreDepositAt,
  getTerrainValleyAt,
  isBuildUnlocked,
  isLandCell,
  isTraversableCell,
  maxUnlockedBridgeTier,
  resolveAccessibleBridgeTier,
  placeBridgeTile,
  refundBuildCost,
  removeBeltAt,
  removeMinerAt,
  spendBuildCost,
  toEconomySnapshot,
  type Direction,
  type GameState,
} from '../../../game/engine'
import {
  getBridgeTierForBuild,
  getBuildPlacementSurface,
  getMinerBuildKind,
  isBeltBuildId,
  isMinerBuildId,
  providesStorage,
} from '../../../game/engine/buildingCatalog'
import type { BuildId } from '../buildCatalog'
import { toCellKey, type Point } from './canvasMath'
import { getStructureCells, getStructureFootprint, type StructureFootprint } from './machineLayout'
import { getBlockingValleyDecorationType, type BlockingValleyDecorationType } from '../theme/valleyDecorations'

export type PlacementPathStep = {
  cell: Point
  direction: Direction
}

type PlacementMaps = {
  placedStructures: Map<string, PlacedStructure>
  occupiedStructureCells: Map<string, string>
  refundableBuilds: Map<string, BuildId>
}

type PlacementContext = PlacementMaps & {
  state: GameState
  reachable?: Set<string>
  bridgeTierContext?: BridgeTierContext
}

type BridgeTierContext = {
  accessibleTier: number
  placeableTier: number
}

const RELAY_MAX_LINK_DISTANCE_TILES = 10

export type PlacedStructure = {
  anchor: Point
  anchorKey: string
  buildId: BuildId
  direction: Direction
  footprint: StructureFootprint
  occupiedKeys: string[]
}

function structureCenter(anchor: Point, footprint: StructureFootprint): { x: number; y: number } {
  return {
    x: anchor.x + footprint.width * 0.5,
    y: anchor.y + footprint.height * 0.5,
  }
}

function hasRelayLinkInRange(
  placedStructures: Map<string, PlacedStructure>,
  anchor: Point,
  direction: Direction,
): boolean {
  const relayFootprint = getStructureFootprint('relay_tower', direction)
  const relayCenter = structureCenter(anchor, relayFootprint)
  const maxDistanceSq = RELAY_MAX_LINK_DISTANCE_TILES * RELAY_MAX_LINK_DISTANCE_TILES
  for (const structure of placedStructures.values()) {
    if (structure.buildId !== 'relay_tower' && structure.buildId !== 'logistics_hub') continue
    const providerCenter = structureCenter(structure.anchor, structure.footprint)
    const dx = relayCenter.x - providerCenter.x
    const dy = relayCenter.y - providerCenter.y
    if (dx * dx + dy * dy <= maxDistanceSq + 1e-9) return true
  }
  return false
}

function directionFromDelta(dx: number, dy: number, fallback: Direction): Direction {
  if (dx === 0 && dy === 0) return fallback
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'down' : 'up'
}

function appendStraightSegment(path: Point[], target: Point): void {
  const last = path[path.length - 1]
  const stepX = Math.sign(target.x - last.x)
  const stepY = Math.sign(target.y - last.y)
  let x = last.x
  let y = last.y

  while (x !== target.x || y !== target.y) {
    x += stepX
    y += stepY
    path.push({ x, y })
  }
}

function lockToAxis(anchor: Point, target: Point): Point {
  const dx = Math.abs(target.x - anchor.x)
  const dy = Math.abs(target.y - anchor.y)
  if (dx >= dy) {
    return { x: target.x, y: anchor.y }
  }
  return { x: anchor.x, y: target.y }
}

function matchesPlacementSurface(
  state: GameState,
  x: number,
  y: number,
  buildId: BuildId,
  maxBridgeTier: number,
): boolean {
  const surface = getBuildPlacementSurface(buildId)
  if (surface === 'path') return isTraversableCell(state, x, y, maxBridgeTier)
  if (surface === 'void') return !isLandCell(state, x, y)
  return isLandCell(state, x, y)
}

function getBlockingDecorationAt(
  state: GameState,
  x: number,
  y: number,
  maxBridgeTier: number,
): BlockingValleyDecorationType | null {
  const valley = getTerrainValleyAt(state, x, y)
  if (valley === undefined || valley > Math.max(1, maxBridgeTier)) return null
  const blockingType = getBlockingValleyDecorationType(x, y, valley)
  if (!blockingType) return null
  if (getOreDepositAt(state, x, y)) return null
  return blockingType
}

function blockingDecorationFailureReason(type: BlockingValleyDecorationType): string {
  return type === 'tree' ? 'blocked by tree!' : 'blocked by rock!'
}

function placementSurfaceFailureReason(buildId: BuildId): string {
  const surface = getBuildPlacementSurface(buildId)
  if (surface === 'path') return 'requires path tile!'
  if (surface === 'void') return 'cannot place on land!'
  return 'cannot place on void!'
}

function resolveBridgeTierContext(state: GameState): BridgeTierContext {
  const unlockedTier = Math.max(1, maxUnlockedBridgeTier(state.unlocked))
  const accessibleTier = resolveAccessibleBridgeTier(state, unlockedTier)
  const placeableTier = Math.min(unlockedTier, accessibleTier + 1)
  return {
    accessibleTier,
    placeableTier,
  }
}

export function buildPlacementPath(
  anchor: Point,
  target: Point,
  axisLock: boolean,
  fallbackDirection: Direction,
): PlacementPathStep[] {
  const resolvedTarget = axisLock ? lockToAxis(anchor, target) : target
  const path: Point[] = [{ x: anchor.x, y: anchor.y }]

  if (anchor.x === resolvedTarget.x || anchor.y === resolvedTarget.y) {
    appendStraightSegment(path, resolvedTarget)
  } else {
    const dx = Math.abs(resolvedTarget.x - anchor.x)
    const dy = Math.abs(resolvedTarget.y - anchor.y)
    if (dx >= dy) {
      appendStraightSegment(path, { x: resolvedTarget.x, y: anchor.y })
      appendStraightSegment(path, resolvedTarget)
    } else {
      appendStraightSegment(path, { x: anchor.x, y: resolvedTarget.y })
      appendStraightSegment(path, resolvedTarget)
    }
  }

  return path.map((cell, index) => {
    const next = path[index + 1]
    const prev = path[index - 1]
    let dx = 0
    let dy = 0
    if (next) {
      dx = next.x - cell.x
      dy = next.y - cell.y
    } else if (prev) {
      dx = cell.x - prev.x
      dy = cell.y - prev.y
    }

    return {
      cell,
      direction: directionFromDelta(dx, dy, fallbackDirection),
    }
  })
}

export function canPlaceBuildAt(
  context: PlacementContext,
  cell: Point,
  buildId: BuildId,
  direction: Direction,
): boolean {
  const { state, occupiedStructureCells } = context
  if (!isBuildUnlocked(state, buildId)) return false

  const key = toCellKey(cell.x, cell.y)
  const tierContext = context.bridgeTierContext ?? resolveBridgeTierContext(state)
  const bridgeTier = getBridgeTierForBuild(buildId)
  if (bridgeTier > 0) {
    return canPlaceBridgeTile(state, cell.x, cell.y, bridgeTier, tierContext.placeableTier)
  }

  const reachable = context.reachable ?? buildReachableSet(state, tierContext.accessibleTier)
  if (!reachable.has(key)) return false

  const hasBelt = Boolean(getBeltAt(state, cell.x, cell.y))
  const existingMiner = getMinerAt(state, cell.x, cell.y)
  const hasMiner = Boolean(existingMiner)
  const hasHub = Boolean(getHubAt(state, cell.x, cell.y))
  const hasPlacedStructure = occupiedStructureCells.has(key)

  if (isBeltBuildId(buildId)) {
    return (
      matchesPlacementSurface(state, cell.x, cell.y, buildId, tierContext.accessibleTier) &&
      !getBlockingDecorationAt(state, cell.x, cell.y, tierContext.accessibleTier) &&
      !hasMiner &&
      !hasHub &&
      !hasPlacedStructure
    )
  }

  if (isMinerBuildId(buildId)) {
    if (!matchesPlacementSurface(state, cell.x, cell.y, buildId, tierContext.accessibleTier)) return false
    if (getBlockingDecorationAt(state, cell.x, cell.y, tierContext.accessibleTier)) return false
    if (hasBelt || hasHub || hasPlacedStructure) return false
    const deposit = getOreDepositAt(state, cell.x, cell.y)
    if (!deposit || deposit.richness <= 0) return false
    const kind = getMinerBuildKind(buildId)
    if (!kind) return false
    return !existingMiner || existingMiner.kind === kind
  }

  const occupiedCells = getStructureCells(cell, buildId, direction)
  if (occupiedCells.length === 0) return false
  for (const occupied of occupiedCells) {
    const occupiedKey = toCellKey(occupied.x, occupied.y)
    if (!reachable.has(occupiedKey)) return false
    if (!matchesPlacementSurface(state, occupied.x, occupied.y, buildId, tierContext.accessibleTier)) return false
    if (getBlockingDecorationAt(state, occupied.x, occupied.y, tierContext.accessibleTier)) return false
    if (getBeltAt(state, occupied.x, occupied.y)) return false
    if (getMinerAt(state, occupied.x, occupied.y)) return false
    if (getHubAt(state, occupied.x, occupied.y)) return false
    if (occupiedStructureCells.has(occupiedKey)) return false
  }
  if (buildId === 'relay_tower' && !hasRelayLinkInRange(context.placedStructures, cell, direction)) return false
  return true
}

export function getPlacementFailureReason(
  context: PlacementContext,
  cell: Point,
  buildId: BuildId,
  direction: Direction,
): string {
  const { state, occupiedStructureCells } = context
  if (!isBuildUnlocked(state, buildId)) return 'build is locked!'

  const cost = BUILD_COSTS[buildId]
  const snapshot = toEconomySnapshot(state)
  if (!canAffordCost(snapshot, cost)) return 'not enough materials!'

  const key = toCellKey(cell.x, cell.y)
  const tierContext = context.bridgeTierContext ?? resolveBridgeTierContext(state)
  const bridgeTier = getBridgeTierForBuild(buildId)
  if (bridgeTier > 0) {
    if (bridgeTier > tierContext.placeableTier) {
      return `requires tier ${Math.min(4, tierContext.placeableTier + 1)} island access!`
    }
    if (isLandCell(state, cell.x, cell.y)) {
      return 'bridge only spans void!'
    }
    if (!canPlaceBridgeTile(state, cell.x, cell.y, bridgeTier, tierContext.placeableTier)) {
      return 'bridge must connect to your current path!'
    }
    return 'cannot place bridge here!'
  }

  const reachable = context.reachable ?? buildReachableSet(state, tierContext.accessibleTier)
  if (!reachable.has(key)) return 'out of reach!'

  const hasBelt = Boolean(getBeltAt(state, cell.x, cell.y))
  const existingMiner = getMinerAt(state, cell.x, cell.y)
  const hasMiner = Boolean(existingMiner)
  const hasHub = Boolean(getHubAt(state, cell.x, cell.y))
  const hasPlacedStructure = occupiedStructureCells.has(key)

  if (isBeltBuildId(buildId)) {
    if (!matchesPlacementSurface(state, cell.x, cell.y, buildId, tierContext.accessibleTier)) {
      return placementSurfaceFailureReason(buildId)
    }
    const blockingDecoration = getBlockingDecorationAt(state, cell.x, cell.y, tierContext.accessibleTier)
    if (blockingDecoration) return blockingDecorationFailureReason(blockingDecoration)
    if (hasMiner || hasHub || hasPlacedStructure) return 'tile is occupied!'
    return 'cannot place here!'
  }

  if (isMinerBuildId(buildId)) {
    if (!matchesPlacementSurface(state, cell.x, cell.y, buildId, tierContext.accessibleTier)) {
      return placementSurfaceFailureReason(buildId)
    }
    const blockingDecoration = getBlockingDecorationAt(state, cell.x, cell.y, tierContext.accessibleTier)
    if (blockingDecoration) return blockingDecorationFailureReason(blockingDecoration)
    if (hasBelt || hasHub || hasPlacedStructure) return 'tile is occupied!'
    const deposit = getOreDepositAt(state, cell.x, cell.y)
    if (!deposit || deposit.richness <= 0) return 'needs ore deposit!'
    const kind = getMinerBuildKind(buildId)
    if (!kind) return 'invalid miner config!'
    if (existingMiner && existingMiner.kind !== kind) return 'remove existing miner!'
    return 'cannot place here!'
  }

  const occupiedCells = getStructureCells(cell, buildId, direction)
  if (occupiedCells.length === 0) return 'cannot place here!'
  for (const occupied of occupiedCells) {
    const occupiedKey = toCellKey(occupied.x, occupied.y)
    if (!reachable.has(occupiedKey)) return 'out of reach!'
    if (!matchesPlacementSurface(state, occupied.x, occupied.y, buildId, tierContext.accessibleTier)) {
      return placementSurfaceFailureReason(buildId)
    }
    const blockingDecoration = getBlockingDecorationAt(state, occupied.x, occupied.y, tierContext.accessibleTier)
    if (blockingDecoration) return blockingDecorationFailureReason(blockingDecoration)
    if (getBeltAt(state, occupied.x, occupied.y)) return 'remove belt first!'
    if (getMinerAt(state, occupied.x, occupied.y)) return 'remove miner first!'
    if (getHubAt(state, occupied.x, occupied.y)) return 'too close to hub!'
    if (occupiedStructureCells.has(occupiedKey)) return 'tile is occupied!'
  }
  if (buildId === 'relay_tower' && !hasRelayLinkInRange(context.placedStructures, cell, direction)) {
    return 'too far! place within 10 tiles of logistics hub or relay tower'
  }
  return 'cannot place here!'
}

export function tryPlaceBuildAt(
  context: PlacementContext,
  cell: Point,
  buildId: BuildId,
  direction: Direction,
): boolean {
  const { state, placedStructures, occupiedStructureCells, refundableBuilds } = context
  if (!isBuildUnlocked(state, buildId)) return false

  const key = toCellKey(cell.x, cell.y)
  const tierContext = context.bridgeTierContext ?? resolveBridgeTierContext(state)
  const reachable = context.reachable ?? buildReachableSet(state, tierContext.accessibleTier)
  const bridgeTier = getBridgeTierForBuild(buildId)

  if (bridgeTier > 0) {
    if (!canPlaceBridgeTile(state, cell.x, cell.y, bridgeTier, tierContext.placeableTier)) return false
    if (!spendBuildCost(state, buildId)) return false
    const placed = placeBridgeTile(state, cell.x, cell.y, bridgeTier, tierContext.placeableTier)
    if (!placed) return false
    refundableBuilds.set(key, buildId)
    return true
  }

  if (!reachable.has(key)) return false

  const hasBelt = Boolean(getBeltAt(state, cell.x, cell.y))
  const existingMiner = getMinerAt(state, cell.x, cell.y)
  const hasMiner = Boolean(existingMiner)
  const hasHub = Boolean(getHubAt(state, cell.x, cell.y))
  const hasPlacedStructure = occupiedStructureCells.has(key)

  if (isBeltBuildId(buildId)) {
    if (!matchesPlacementSurface(state, cell.x, cell.y, buildId, tierContext.accessibleTier)) return false
    if (getBlockingDecorationAt(state, cell.x, cell.y, tierContext.accessibleTier)) return false
    if (hasMiner || hasHub || hasPlacedStructure) return false
    const shouldCharge = !hasBelt
    if (shouldCharge && !spendBuildCost(state, buildId)) return false
    addBelt(state, cell.x, cell.y, direction, buildId)
    if (shouldCharge) refundableBuilds.set(key, buildId)
    return true
  }

  if (isMinerBuildId(buildId)) {
    if (!matchesPlacementSurface(state, cell.x, cell.y, buildId, tierContext.accessibleTier)) return false
    if (getBlockingDecorationAt(state, cell.x, cell.y, tierContext.accessibleTier)) return false
    if (hasBelt || hasHub || hasPlacedStructure) return false
    const deposit = getOreDepositAt(state, cell.x, cell.y)
    if (!deposit || deposit.richness <= 0) return false
    const kind = getMinerBuildKind(buildId)
    if (!kind) return false
    if (existingMiner && existingMiner.kind !== kind) return false
    const shouldCharge = !existingMiner
    if (shouldCharge && !spendBuildCost(state, buildId)) return false
    addMiner(state, cell.x, cell.y, direction, kind)
    if (shouldCharge) refundableBuilds.set(key, buildId)
    return true
  }

  if (hasBelt || hasMiner || hasHub || hasPlacedStructure) return false
  const occupiedCells = getStructureCells(cell, buildId, direction)
  for (const occupied of occupiedCells) {
    const occupiedKey = toCellKey(occupied.x, occupied.y)
    if (!reachable.has(occupiedKey)) return false
    if (!matchesPlacementSurface(state, occupied.x, occupied.y, buildId, tierContext.accessibleTier)) return false
    if (getBlockingDecorationAt(state, occupied.x, occupied.y, tierContext.accessibleTier)) return false
    if (getBeltAt(state, occupied.x, occupied.y)) return false
    if (getMinerAt(state, occupied.x, occupied.y)) return false
    if (getHubAt(state, occupied.x, occupied.y)) return false
    if (occupiedStructureCells.has(occupiedKey)) return false
  }
  if (buildId === 'relay_tower' && !hasRelayLinkInRange(placedStructures, cell, direction)) return false
  if (!spendBuildCost(state, buildId)) return false
  const footprint = getStructureFootprint(buildId, direction)
  const occupiedKeys = occupiedCells.map((occupied) => toCellKey(occupied.x, occupied.y))
  placedStructures.set(key, {
    anchor: { ...cell },
    anchorKey: key,
    buildId,
    direction,
    footprint,
    occupiedKeys,
  })
  for (const occupiedKey of occupiedKeys) {
    occupiedStructureCells.set(occupiedKey, key)
  }
  if (providesStorage(buildId)) {
    state.storageBuildings += 1
  }
  refundableBuilds.set(key, buildId)
  return true
}

export function removeBuildAt(context: PlacementContext, cell: Point): boolean {
  const { state, placedStructures, occupiedStructureCells, refundableBuilds } = context
  const key = toCellKey(cell.x, cell.y)
  const structureAnchorKey = occupiedStructureCells.get(key) ?? key
  let removed = false

  const removedBelt = removeBeltAt(state, cell.x, cell.y)
  const removedMiner = removeMinerAt(state, cell.x, cell.y)
  if (removedBelt || removedMiner) removed = true

  if (state.bridges[key] !== undefined) {
    delete state.bridges[key]
    removed = true
  }

  const structure = placedStructures.get(structureAnchorKey)
  if (structure) {
    for (const occupiedKey of structure.occupiedKeys) {
      occupiedStructureCells.delete(occupiedKey)
    }
    placedStructures.delete(structureAnchorKey)
    if (providesStorage(structure.buildId)) {
      state.storageBuildings = Math.max(0, state.storageBuildings - 1)
      clampStateToStorage(state)
    }
    removed = true
  }

  const refundableBuild = refundableBuilds.get(structureAnchorKey) ?? refundableBuilds.get(key)
  if (refundableBuild) {
    refundBuildCost(state, refundableBuild)
    refundableBuilds.delete(structureAnchorKey)
    refundableBuilds.delete(key)
    removed = true
  } else if (removed) {
    refundableBuilds.delete(structureAnchorKey)
    refundableBuilds.delete(key)
  }

  return removed
}
