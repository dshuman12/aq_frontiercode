/* eslint-disable react-hooks/exhaustive-deps */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  BUILDABLE_IDS,
  CRAFT_RECIPES,
  MATERIAL_LABELS,
  MATERIAL_TYPES,
  ORE_TYPES,
  addResourceToState,
  buildReachableSet,
  craftRecipe,
  createState,
  getTerrainValleyAt,
  maxUnlockedBridgeTier,
  resolveAccessibleBridgeTier,
  simulateStep,
  seedDemoWorld,
  toEconomySnapshot,
  unlockBuild,
  type BuildableId,
  type CraftRecipeId,
  type Direction,
  type EconomySnapshot,
  type GameState,
  type OreType,
  type ProcessingMachineState,
  type ProcessingStatus,
  type ProcessingStructureState,
  type SimulationDynamicState,
} from '../../../game/engine'
import {
  BUILD_DEFINITIONS,
  getBridgeTierForBuild,
  getProcessingBuildIds,
  getProcessingCycleSec,
  isBridgeBuildId,
  isBuildDirectional,
  isDepotInputBuildId,
  isDepotOutputBuildId,
  isProcessingBuildId,
} from '../../../game/engine/buildingCatalog'
import type { InputSystem } from '../../../game/input'
import { BUILD_COLORS, type BuildId } from '../buildCatalog'
import { ORE_VISUALS } from '../oreCatalog'
import { canPlace, type PlacementIntent } from '../placement'
import CanvasHoverOverlay from './CanvasHoverOverlay'
import {
  BASE_CELL_SIZE,
  gridToWorld,
  screenToWorld,
  toCellKey,
  worldToGrid,
  worldToScreen,
  type Camera,
  type Point,
} from './canvasMath'
import { DX, DY } from './canvasDirections'
import {
  buildPlacementPath,
  canPlaceBuildAt,
  getPlacementFailureReason,
  type PlacedStructure,
  removeBuildAt,
  tryPlaceBuildAt,
  type PlacementPathStep,
} from './canvasPlacement'
import { computeBeltActivityState } from './simulation/beltActivity'
import { renderBeltsLayer } from './render/beltLayerRenderer'
import { renderMinersLayer } from './render/minerLayerRenderer'
import { renderStructuresLayer } from './render/structureLayerRenderer'
import {
  getInputLaneCounts,
  getStructureFootprint,
} from './machineLayout'
import { getStructureIoPorts } from './render/structureIoPorts'
import { createHoverInspectorStore, type HoverInspector } from './hoverInspectorStore'
import { buildHoverInspectorSnapshot } from './hover/hoverInspectorBuilder'
import {
  buildMultiplayerSnapshot,
  normalizeMultiplayerSnapshot,
} from '../multiplayer/snapshotCodec'
import type {
  LockstepBootstrap,
  LockstepCommandEnvelope,
  LockstepCommandPayload,
  LockstepTickPacket,
  LocalPlayerPresenceUpdate,
  MultiplayerOverlaySettings,
  MultiplayerStateSnapshot,
  OutboundLockstepCommand,
  RemotePlayerPresence,
} from '../multiplayer/types'
import { getCanvasPalette } from '../theme/canvasPalette'
import {
  closeOreSpriteBitmaps,
  loadOreSpriteBitmaps,
  pickOreSpriteVariant,
  type OreSpriteBitmaps,
} from '../theme/oreSprites'
import {
  TERRAIN_TILESET_DEFINITION,
  closeTerrainTilesetBitmaps,
  loadTerrainTilesetBitmaps,
  pickTerrainTilesetVariant,
  type TerrainTilesetBitmaps,
} from '../theme/terrainTileset'
import {
  closeBuildingSpriteBitmaps,
  loadBuildingSpriteBitmaps,
  pickHubSprite,
  type BuildingSpriteBitmaps,
} from '../theme/buildingSprites'
import {
  closeValleyDecorationBitmaps,
  loadValleyDecorationBitmaps,
  pickValleyDecorationVariant,
  type ValleyDecorationBitmaps,
} from '../theme/valleyDecorations'
import ProductionConfigModal, { type SelectedProductionConfigView } from './windows/ProductionConfigModal'
import type {
  SimulationWorkerStepMessage,
  SimulationWorkerStepResultMessage,
} from '../workers/simulationWorkerTypes'

const ORE_ITEM_COLORS: Record<OreType, { fill: string; stroke: string }> = ORE_TYPES.reduce(
  (acc, ore) => {
    acc[ore] = { fill: ORE_VISUALS[ore].fill, stroke: ORE_VISUALS[ore].stroke }
    return acc
  },
  {} as Record<OreType, { fill: string; stroke: string }>,
)

const BELT_CELLS_PER_SECOND = 2
const PLACEMENT_FEEDBACK_DURATION_MS = 1000
const TERRAIN_CHUNK_SIZE = 32
const LOW_DETAIL_CELL_SIZE = 12
const VERY_LOW_DETAIL_CELL_SIZE = 7
const HIDE_ITEM_CELL_SIZE = 8
const CAMERA_NAV_OPTIMIZATION_HOLD_MS = 160
const MAX_DETAILED_BELTS = 320
const MAX_DETAILED_MINERS = 120
const MAX_DETAILED_PROCESSING_STRUCTURES = 90
const MAX_LOCKSTEP_CATCHUP_TICKS = 24
const DEBUG_INFINITE_STORAGE_BUILDINGS = 1_000_000
const DEFAULT_LOCKSTEP_TICK_INTERVAL_MS = 1000 / 60
const LOCKSTEP_INPUT_DELAY_TICKS = 4
const MINER_SPRITE_DIRECTION_OFFSET = Math.PI / 2
const BELT_FLOW_VISUAL_CELLS_PER_SECOND = BELT_CELLS_PER_SECOND
const MINER_ACTIVE_PULSE_AMPLITUDE = 0.035
const MINER_ACTIVE_PULSE_SPEED = 8.6
const PROCESSING_ACTIVE_PULSE_AMPLITUDE = 0.028
const PROCESSING_ACTIVE_PULSE_SPEED = 6.2
const RELAY_MAX_LINK_DISTANCE_TILES = 10
const POWER_COVERAGE_OFFSETS: Record<'logistics_hub' | 'relay_tower', { min: number; max: number }> = {
  logistics_hub: { min: -6, max: 6 }, // 13x13
  relay_tower: { min: -3, max: 3 }, // 7x7
}
const KNOWN_RESOURCE_IDS = (() => {
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
const ORE_RESOURCE_IDS = new Set<string>(ORE_TYPES as readonly string[])
const BRIDGE_BUILD_BY_TIER: Record<number, BuildId> = BUILDABLE_IDS.reduce(
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

export type MachineTimingInput = {
  resource: string
  amountPerCycle: number
  requiredPerSecond: number
  lanes: number
  lanesForOptimal: number
}

export type MachineTimingMetric = {
  id: string
  buildId: BuildId
  recipeId: CraftRecipeId | null
  status: ProcessingStatus
  cycleSec: number
  outputResource: string | null
  outputPerSecond: number
  outputLanes: number
  utilization: number
  inputLanes: number
  inputs: MachineTimingInput[]
}

export type TimingSnapshot = {
  timestampSec: number
  beltCellsPerSecond: number
  belts: number
  itemsInTransit: number
  power: {
    generated: number
    allocated: number
    demandInCoverage: number
    demandTotal: number
    surplus: number
    deficit: number
  }
  machines: MachineTimingMetric[]
  performance: {
    fps: number
    frameMs: number
    updateMs: number
    drawMs: number
    terrainTilesTotal: number
    terrainTilesVisible: number
    bridgesVisible: number
    depositsVisible: number
    beltsVisible: number
    minersVisible: number
    itemsVisible: number
    structuresVisible: number
    drawCallsEstimate: number
    terrainRasterReady: boolean
    terrainRasterChunks: number
    cameraOptimizationActive: boolean
  }
}

const EMPTY_POWER_TELEMETRY: TimingSnapshot['power'] = {
  generated: 0,
  allocated: 0,
  demandInCoverage: 0,
  demandTotal: 0,
  surplus: 0,
  deficit: 0,
}

const PROCESSING_STATION_IDS: BuildId[] = getProcessingBuildIds() as BuildId[]
const PROCESSING_STATION_SET = new Set<BuildId>(PROCESSING_STATION_IDS)
const ALL_RESOURCE_IDS: string[] = Array.from(KNOWN_RESOURCE_IDS).sort((left, right) => left.localeCompare(right))

const RECIPES_BY_STATION: Partial<Record<BuildId, CraftRecipeId[]>> = Object.values(CRAFT_RECIPES).reduce(
  (acc, recipe) => {
    if (recipe.station === 'manual') return acc
    const stationId = recipe.station as BuildId
    if (!PROCESSING_STATION_SET.has(stationId)) return acc
    const bucket = acc[stationId] ?? []
    bucket.push(recipe.id)
    acc[stationId] = bucket.sort((a, b) => {
      const left = CRAFT_RECIPES[a]
      const right = CRAFT_RECIPES[b]
      if (left.valley !== right.valley) return left.valley - right.valley
      return left.label.localeCompare(right.label)
    })
    return acc
  },
  {} as Partial<Record<BuildId, CraftRecipeId[]>>,
)

function buildLabel(buildId: BuildId): string {
  return BUILD_DEFINITIONS[buildId]?.label ?? buildId
}

function machineStatusLabel(status: ProcessingStatus): string {
  if (status === 'crafting') return 'running'
  if (status === 'waiting_power') return 'unpowered'
  if (status === 'waiting_resources') return 'waiting for ingredients'
  if (status === 'waiting_requirements') return 'waiting for unlock/valley'
  if (status === 'waiting_output') return 'output belt blocked'
  return 'idle'
}

function resourceLabel(resource: string): string {
  if (resource in ORE_VISUALS) return ORE_VISUALS[resource as keyof typeof ORE_VISUALS].label
  if (resource in MATERIAL_LABELS) return MATERIAL_LABELS[resource as keyof typeof MATERIAL_LABELS]
  return resource
}

export type GameCanvasActions = {
  craft: (recipeId: CraftRecipeId) => boolean
  unlock: (buildId: BuildableId) => boolean
  debug: {
    addResource: (resource: string, amount: number) => { ok: boolean; message: string }
    fillResources: (mode: 'half' | 'max') => { ok: boolean; message: string }
    setInfiniteCapacity: () => { ok: boolean; message: string }
    unlockBuild: (buildId: string) => { ok: boolean; message: string }
    unlockAll: () => { ok: boolean; message: string }
    setBridgeTier: (tier: number) => { ok: boolean; message: string }
    regenerateWorld: (seed?: number) => { ok: boolean; message: string }
    getWorldSeed: () => number
    snapshot: () => EconomySnapshot
  }
}

type GameCanvasProps = {
  placementIntent: PlacementIntent
  placementDirection: Direction
  inputSystem: InputSystem
  onEconomyChange?: (snapshot: EconomySnapshot) => void
  onTimingChange?: (snapshot: TimingSnapshot) => void
  onProgressionTierChange?: (tier: number) => void
  onBindActions?: (actions: GameCanvasActions | null) => void
  multiplayerEnabled?: boolean
  multiplayerSnapshot?: MultiplayerStateSnapshot | null
  onMultiplayerStateChange?: (snapshot: MultiplayerStateSnapshot) => void
  lockstepBootstrap?: LockstepBootstrap | null
  snapshotRequestVersion?: number
  drainLockstepTicks?: () => LockstepTickPacket[]
  onMultiplayerCommand?: (command: OutboundLockstepCommand) => void
  remotePresences?: Record<string, RemotePlayerPresence>
  overlaySettings?: MultiplayerOverlaySettings
  onLocalPresenceUpdate?: (presence: LocalPlayerPresenceUpdate | null) => void
}

type PlacementDragState = {
  active: boolean
  anchorCell: Point | null
  previewSteps: PlacementPathStep[]
}

type PanDragState = {
  active: boolean
  lastPointer: Point
}

type PlacementCommitResult = {
  changed: boolean
  reason: string | null
}

type RelayPlacementStatus = {
  tone: 'good' | 'bad'
  message: string
}

type TerrainCell = {
  x: number
  y: number
  valley: number
}

type TerrainRasterChunkCache = {
  terrainCount: number
  bitmaps: [ImageBitmap, ImageBitmap, ImageBitmap, ImageBitmap]
}

type TerrainRasterWorkerChunkMessage = {
  type: 'chunk'
  buildId: number
  key: string
  terrainCount: number
  bitmaps: [ImageBitmap, ImageBitmap, ImageBitmap, ImageBitmap]
}

type TerrainRasterWorkerDoneMessage = {
  type: 'done'
  buildId: number
}

type MaxwellSpriteState = {
  active: boolean
  startSec: number
  durationSec: number
  fromX: number
  toX: number
  y: number
  size: number
  bobAmplitude: number
  bobPhase: number
  nextSpawnSec: number
}

type PowerProviderVisual = {
  id: string
  buildId: 'relay_tower' | 'logistics_hub'
  anchor: Point
  footprint: { width: number; height: number }
  center: { x: number; y: number }
}

type PowerConsumerVisual = {
  id: string
  center: { x: number; y: number }
  cells: Point[]
}

type PowerProviderLink = {
  fromId: string
  toId: string
}

function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  dir: Direction,
  size: number,
): void {
  const dx = DX[dir]
  const dy = DY[dir]
  const tipX = centerX + dx * size
  const tipY = centerY + dy * size
  const leftX = centerX - dx * size * 0.4 + dy * size * 0.5
  const leftY = centerY - dy * size * 0.4 - dx * size * 0.5
  const rightX = centerX - dx * size * 0.4 - dy * size * 0.5
  const rightY = centerY - dy * size * 0.4 + dx * size * 0.5

  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(leftX, leftY)
  ctx.lineTo(rightX, rightY)
  ctx.closePath()
  ctx.fill()
}

function drawIoPortArrow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  direction: Direction,
  size: number,
): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(18, 30, 24, 0.92)'
  ctx.lineWidth = Math.max(1.4, size * 0.16)
  ctx.lineCap = 'round'
  const dx = DX[direction]
  const dy = DY[direction]
  const stem = size * 0.88
  ctx.beginPath()
  ctx.moveTo(centerX - dx * stem * 0.42, centerY - dy * stem * 0.42)
  ctx.lineTo(centerX + dx * stem * 0.1, centerY + dy * stem * 0.1)
  ctx.stroke()
  drawDirectionArrow(ctx, centerX, centerY, direction, size)
  ctx.restore()
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === 'up') return 'down'
  if (direction === 'down') return 'up'
  if (direction === 'left') return 'right'
  return 'left'
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, camera: Camera): void {
  const palette = getCanvasPalette()
  const cellSize = BASE_CELL_SIZE * camera.scale
  const startX = Math.floor(-camera.offset.x / cellSize) * cellSize + camera.offset.x
  const startY = Math.floor(-camera.offset.y / cellSize) * cellSize + camera.offset.y

  ctx.strokeStyle = `rgba(${palette.gridStrokeRgb}, 0.2)`
  ctx.lineWidth = 1

  for (let x = startX; x < width; x += cellSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = startY; y < height; y += cellSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  cell: Point,
  buildId: BuildId,
  placementDirection: Direction,
  camera: Camera,
  valid: boolean,
): void {
  const color = BUILD_COLORS[buildId]
  const footprint = getStructureFootprint(buildId, placementDirection)
  const world = gridToWorld(cell)
  const screen = worldToScreen(world, camera)
  const cellSize = BASE_CELL_SIZE * camera.scale
  const drawWidth = cellSize * footprint.width
  const drawHeight = cellSize * footprint.height

  ctx.globalAlpha = valid ? 0.8 : 0.45
  ctx.fillStyle = valid ? color.fill : '#d05b5b'
  ctx.strokeStyle = valid ? color.stroke : '#812d2d'
  ctx.lineWidth = 2
  ctx.fillRect(screen.x, screen.y, drawWidth, drawHeight)
  ctx.strokeRect(screen.x, screen.y, drawWidth, drawHeight)

  if (isBuildDirectional(buildId) || isProcessingBuildId(buildId)) {
    ctx.fillStyle = valid ? color.stroke : '#812d2d'
    drawDirectionArrow(
      ctx,
      screen.x + drawWidth / 2,
      screen.y + drawHeight / 2,
      placementDirection,
      Math.min(drawWidth, drawHeight) * 0.26,
    )
  }

  const hasIoPorts = isProcessingBuildId(buildId) || isDepotInputBuildId(buildId) || isDepotOutputBuildId(buildId)
  if (hasIoPorts) {
    const palette = getCanvasPalette()
    const ports = getStructureIoPorts(cell, footprint, buildId, placementDirection, null)
    for (const port of ports) {
      const portScreen = worldToScreen(
        {
          x: port.edgeX * BASE_CELL_SIZE,
          y: port.edgeY * BASE_CELL_SIZE,
        },
        camera,
      )
      ctx.fillStyle = port.kind === 'input' ? palette.machinePortPreviewInput : palette.machinePortPreviewOutput
      const dir = port.kind === 'input' ? oppositeDirection(port.side) : port.side
      drawIoPortArrow(ctx, portScreen.x, portScreen.y, dir, Math.max(3.8, cellSize * 0.2))
    }
  }
  ctx.globalAlpha = 1
}

function terrainChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`
}

function presenceColorForUser(userId: string): { stroke: string; fill: string; text: string } {
  void userId
  return {
    stroke: 'rgba(255, 255, 255, 0.96)',
    fill: 'rgba(255, 255, 255, 0.2)',
    text: '#101010',
  }
}

function resolveKnownBuildId(rawBuildId: string | null): BuildId | null {
  if (!rawBuildId) return null
  if (rawBuildId in BUILD_COLORS) return rawBuildId as BuildId
  return null
}

function readNowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

function structureCenter(anchor: Point, footprint: { width: number; height: number }): { x: number; y: number } {
  return {
    x: anchor.x + footprint.width * 0.5,
    y: anchor.y + footprint.height * 0.5,
  }
}

function powerProviderCoversCell(provider: PowerProviderVisual, cell: Point): boolean {
  const offsets = POWER_COVERAGE_OFFSETS[provider.buildId]
  for (let fx = 0; fx < provider.footprint.width; fx += 1) {
    for (let fy = 0; fy < provider.footprint.height; fy += 1) {
      const originX = provider.anchor.x + fx
      const originY = provider.anchor.y + fy
      if (
        cell.x >= originX + offsets.min &&
        cell.x <= originX + offsets.max &&
        cell.y >= originY + offsets.min &&
        cell.y <= originY + offsets.max
      ) {
        return true
      }
    }
  }
  return false
}

function nearestPowerProviderForConsumer(
  consumer: PowerConsumerVisual,
  providers: PowerProviderVisual[],
): PowerProviderVisual | null {
  let nearest: PowerProviderVisual | null = null
  let nearestDistSq = Number.POSITIVE_INFINITY
  for (const provider of providers) {
    const covered = consumer.cells.some((cell) => powerProviderCoversCell(provider, cell))
    if (!covered) continue
    const dx = consumer.center.x - provider.center.x
    const dy = consumer.center.y - provider.center.y
    const distSq = dx * dx + dy * dy
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq
      nearest = provider
    }
  }
  return nearest
}

function nearestPowerProviderForRelayPlacement(
  anchor: Point,
  direction: Direction,
  providers: PowerProviderVisual[],
): { provider: PowerProviderVisual | null; distanceTiles: number } {
  if (providers.length === 0) {
    return { provider: null, distanceTiles: Number.POSITIVE_INFINITY }
  }
  const relayFootprint = getStructureFootprint('relay_tower', direction)
  const relayCenter = structureCenter(anchor, relayFootprint)
  let nearestProvider: PowerProviderVisual | null = null
  let nearestDistSq = Number.POSITIVE_INFINITY
  for (const provider of providers) {
    const dx = relayCenter.x - provider.center.x
    const dy = relayCenter.y - provider.center.y
    const distSq = dx * dx + dy * dy
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq
      nearestProvider = provider
    }
  }
  return {
    provider: nearestProvider,
    distanceTiles: Math.sqrt(nearestDistSq),
  }
}

function buildEnergizedPowerNetwork(
  providers: PowerProviderVisual[],
): { energizedProviders: PowerProviderVisual[]; links: PowerProviderLink[] } {
  const providerById = new Map(providers.map((provider) => [provider.id, provider]))
  const hubs = providers.filter((provider) => provider.buildId === 'logistics_hub')
  if (hubs.length === 0) {
    return { energizedProviders: [], links: [] }
  }

  const energizedIds = new Set(hubs.map((hub) => hub.id))
  const links: PowerProviderLink[] = []
  const maxLinkDistanceSq = RELAY_MAX_LINK_DISTANCE_TILES * RELAY_MAX_LINK_DISTANCE_TILES
  let activatedInPass = true
  while (activatedInPass) {
    activatedInPass = false
    for (const relay of providers) {
      if (relay.buildId !== 'relay_tower') continue
      if (energizedIds.has(relay.id)) continue
      let nearestProviderId: string | null = null
      let nearestDistSq = Number.POSITIVE_INFINITY
      for (const providerId of energizedIds) {
        const upstreamProvider = providerById.get(providerId)
        if (!upstreamProvider) continue
        const dx = relay.center.x - upstreamProvider.center.x
        const dy = relay.center.y - upstreamProvider.center.y
        const distSq = dx * dx + dy * dy
        if (distSq > maxLinkDistanceSq + 1e-9) continue
        if (distSq < nearestDistSq) {
          nearestDistSq = distSq
          nearestProviderId = upstreamProvider.id
        }
      }
      if (!nearestProviderId) continue
      energizedIds.add(relay.id)
      links.push({ fromId: nearestProviderId, toId: relay.id })
      activatedInPass = true
    }
  }

  return {
    energizedProviders: providers.filter((provider) => energizedIds.has(provider.id)),
    links,
  }
}

function dedupePlacementPathSteps(steps: PlacementPathStep[]): PlacementPathStep[] {
  const seen = new Set<string>()
  const unique: PlacementPathStep[] = []
  for (const step of steps) {
    const key = toCellKey(step.cell.x, step.cell.y)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(step)
  }
  return unique
}

type SerializedPlacementStep = {
  x: number
  y: number
  direction: Direction
}

function dedupeSerializedPlacementSteps(steps: SerializedPlacementStep[]): SerializedPlacementStep[] {
  const seen = new Set<string>()
  const unique: SerializedPlacementStep[] = []
  for (const step of steps) {
    const key = toCellKey(step.x, step.y)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(step)
  }
  return unique
}

function evaluateBridgeDragPreview(
  state: GameState,
  buildId: BuildId,
  steps: PlacementPathStep[],
  unlockedBridgeTier: number,
  accessibleBridgeTier: number,
): Map<string, boolean> {
  const validity = new Map<string, boolean>()
  const bridgeTier = getBridgeTierForBuild(buildId)
  if (bridgeTier <= 0) return validity

  const unlockedTier = Math.max(1, unlockedBridgeTier)
  const placeableTier = Math.min(unlockedTier, Math.max(1, accessibleBridgeTier) + 1)
  if (bridgeTier > placeableTier) {
    for (const step of steps) {
      validity.set(toCellKey(step.cell.x, step.cell.y), false)
    }
    return validity
  }

  const reachable = buildReachableSet(state, placeableTier)
  const pending = dedupePlacementPathSteps(steps)
  let progressed = true
  while (progressed && pending.length > 0) {
    progressed = false
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const step = pending[index]
      const key = toCellKey(step.cell.x, step.cell.y)
      if (state.terrain[key] !== undefined || state.bridges[key] !== undefined) {
        validity.set(key, false)
        pending.splice(index, 1)
        continue
      }

      let hasReachableNeighbor = false
      for (const direction of ['up', 'right', 'down', 'left'] as const) {
        const neighborKey = toCellKey(step.cell.x + DX[direction], step.cell.y + DY[direction])
        if (reachable.has(neighborKey)) {
          hasReachableNeighbor = true
          break
        }
      }
      if (!hasReachableNeighbor) continue

      reachable.add(key)
      validity.set(key, true)
      pending.splice(index, 1)
      progressed = true
    }
  }

  for (const step of pending) {
    validity.set(toCellKey(step.cell.x, step.cell.y), false)
  }

  return validity
}

function GameCanvas({
  placementIntent,
  placementDirection,
  inputSystem,
  onEconomyChange,
  onTimingChange,
  onProgressionTierChange,
  onBindActions,
  multiplayerEnabled = false,
  multiplayerSnapshot,
  onMultiplayerStateChange,
  lockstepBootstrap,
  snapshotRequestVersion = 0,
  drainLockstepTicks,
  onMultiplayerCommand,
  remotePresences = {},
  overlaySettings = {
    showPeerCursors: true,
    showPeerPlacementHints: true,
    showPeerNames: true,
    presenceScale: 1,
  },
  onLocalPresenceUpdate,
}: GameCanvasProps) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const panDragRef = useRef<PanDragState>({
    active: false,
    lastPointer: { x: 0, y: 0 },
  })
  const placementDragRef = useRef<PlacementDragState>({
    active: false,
    anchorCell: null,
    previewSteps: [],
  })
  const hoveredCellRef = useRef<Point | null>(null)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const rafRef = useRef<number | null>(null)
  const placedStructuresRef = useRef<Map<string, PlacedStructure>>(new Map())
  const occupiedStructureCellsRef = useRef<Map<string, string>>(new Map())
  const refundableBuildsRef = useRef<Map<string, BuildId>>(new Map())
  const processingMachinesRef = useRef<Map<string, ProcessingMachineState>>(new Map())
  const simulationWorkerRef = useRef<Worker | null>(null)
  const simulationInFlightRef = useRef(false)
  const simulationPendingDeltaSecRef = useRef(0)
  const simulationRequestIdRef = useRef(0)
  const simulationInputVersionRef = useRef(0)
  const progressionTierCacheRef = useRef<{ version: number; tier: number }>({ version: -1, tier: 1 })
  const maxAccessibleBridgeTierRef = useRef(1)
  const reachableTopologyRevisionRef = useRef(0)
  const reachableSetCacheRef = useRef<{ revision: number; tier: number; reachable: Set<string> }>({
    revision: -1,
    tier: -1,
    reachable: new Set<string>(),
  })
  const permanentlyUnlockedReachableRef = useRef<Set<string>>(new Set())
  const staticWorldSyncNeededRef = useRef(true)
  const terrainChunksRef = useRef<Map<string, TerrainCell[]>>(new Map())
  const terrainRasterCacheRef = useRef<Map<string, TerrainRasterChunkCache>>(new Map())
  const terrainRasterWorkerRef = useRef<Worker | null>(null)
  const terrainTilesetRef = useRef<TerrainTilesetBitmaps | null>(null)
  const buildingSpritesRef = useRef<BuildingSpriteBitmaps | null>(null)
  const valleyDecorationsRef = useRef<ValleyDecorationBitmaps | null>(null)
  const oreSpritesRef = useRef<OreSpriteBitmaps | null>(null)
  const terrainRasterBuildIdRef = useRef(0)
  const terrainRasterReadyRef = useRef(false)
  const terrainTileCountRef = useRef(0)
  const lastFramePerfTimeRef = useRef<number | null>(null)
  const framePerfRef = useRef({
    fps: 0,
    frameMs: 16.7,
    updateMs: 7,
    drawMs: 9,
    terrainTilesVisible: 0,
    bridgesVisible: 0,
    depositsVisible: 0,
    beltsVisible: 0,
    minersVisible: 0,
    itemsVisible: 0,
    structuresVisible: 0,
    drawCallsEstimate: 0,
    terrainRasterReady: false,
    terrainRasterChunks: 0,
    cameraOptimizationActive: false,
  })
  const gameStateRef = useRef(createState())
  const lastTimeRef = useRef<number | null>(null)
  const visualTimeSecRef = useRef(0)
  const zoomMotionUntilMsRef = useRef(0)
  const placementIntentRef = useRef(placementIntent)
  const placementDirectionRef = useRef(placementDirection)
  const inputSystemRef = useRef(inputSystem)
  const onEconomyChangeRef = useRef(onEconomyChange)
  const onTimingChangeRef = useRef(onTimingChange)
  const onProgressionTierChangeRef = useRef(onProgressionTierChange)
  const onMultiplayerStateChangeRef = useRef(onMultiplayerStateChange)
  const onMultiplayerCommandRef = useRef(onMultiplayerCommand)
  const drainLockstepTicksRef = useRef(drainLockstepTicks)
  const onLocalPresenceUpdateRef = useRef(onLocalPresenceUpdate)
  const remotePresencesRef = useRef(remotePresences)
  const overlaySettingsRef = useRef(overlaySettings)
  const lockstepTickIntervalSecRef = useRef(DEFAULT_LOCKSTEP_TICK_INTERVAL_MS * 0.001)
  const lockstepNextTickRef = useRef<number | null>(null)
  const lockstepCurrentServerTickRef = useRef<number>(0)
  const lockstepClockAnchorRef = useRef<{ serverTick: number; receivedAtMs: number } | null>(null)
  const lastQueuedLockstepTickRef = useRef<number>(0)
  const pendingLockstepCommandsByTickRef = useRef<Map<number, LockstepCommandEnvelope[]>>(new Map())
  const skipLockstepCatchupRef = useRef(false)
  const hasCenteredOnStarterHubRef = useRef(false)
  const lastSnapshotRequestVersionRef = useRef(snapshotRequestVersion)
  const lastAppliedMultiplayerUpdateAtRef = useRef(0)
  const lastLocalPresenceFingerprintRef = useRef('')
  const economyFingerprintRef = useRef('')
  const timingFingerprintRef = useRef('')
  const lastTimingEmitSecRef = useRef(0)
  const lastProgressionTierRef = useRef<number | null>(null)
  const [hoverInspectorStore] = useState(() => createHoverInspectorStore(null))
  const hoverInspectorFingerprintRef = useRef('')
  const maxwellImageRef = useRef<HTMLImageElement | null>(null)
  const maxwellSpriteRef = useRef<MaxwellSpriteState>({
    active: false,
    startSec: 0,
    durationSec: 0,
    fromX: 0,
    toX: 0,
    y: 0,
    size: 0,
    bobAmplitude: 0,
    bobPhase: 0,
    nextSpawnSec: 24,
  })
  const selectedMachineKeyRef = useRef<string | null>(null)
  const selectedMachineFingerprintRef = useRef('none')
  const powerTelemetryRef = useRef<TimingSnapshot['power']>(EMPTY_POWER_TELEMETRY)
  const feedbackTimeoutRef = useRef<number | null>(null)
  const [placementFeedback, setPlacementFeedback] = useState<string | null>(null)
  const [relayPlacementStatus, setRelayPlacementStatus] = useState<RelayPlacementStatus | null>(null)
  const relayPlacementStatusFingerprintRef = useRef('none')
  const [selectedMachineView, setSelectedMachineView] = useState<SelectedProductionConfigView | null>(null)

  const emitEconomy = (force = false) => {
    const snapshot = toEconomySnapshot(gameStateRef.current)
    const unlockedCode = Object.values(snapshot.unlocked)
      .map((value) => (value ? '1' : '0'))
      .join('')
    const oreCode = ORE_TYPES.map((ore) => snapshot.inventory[ore]).join(',')
    const materialCode = Object.values(snapshot.materials).join(',')
    const storageCode = `${snapshot.storage.orePerResource}:${snapshot.storage.materialPerResource}:${snapshot.storage.storageBuildings}`
    const fingerprint = `${oreCode}|${materialCode}|${unlockedCode}|${storageCode}`
    if (!force && fingerprint === economyFingerprintRef.current) return
    economyFingerprintRef.current = fingerprint
    onEconomyChangeRef.current?.(snapshot)
  }

  const markSimulationInputDirty = () => {
    simulationInputVersionRef.current += 1
  }

  const markReachabilityTopologyDirty = () => {
    reachableTopologyRevisionRef.current += 1
  }

  const resolveCurrentAccessibleBridgeTier = (): number => {
    const version = simulationInputVersionRef.current
    const cached = progressionTierCacheRef.current
    if (cached.version === version) return cached.tier
    const state = gameStateRef.current
    const unlockedTier = maxUnlockedBridgeTier(state.unlocked)
    const tier = resolveAccessibleBridgeTier(state, unlockedTier)
    const permanentlyUnlockedTier = Math.max(maxAccessibleBridgeTierRef.current, tier)
    maxAccessibleBridgeTierRef.current = permanentlyUnlockedTier
    progressionTierCacheRef.current = {
      version,
      tier: permanentlyUnlockedTier,
    }
    return permanentlyUnlockedTier
  }

  const resolveCurrentReachableSet = (accessibleTier: number): Set<string> => {
    const tier = Math.max(1, Math.floor(accessibleTier))
    const revision = reachableTopologyRevisionRef.current
    const cached = reachableSetCacheRef.current
    if (cached.revision === revision && cached.tier === tier) return permanentlyUnlockedReachableRef.current
    const reachable = buildReachableSet(gameStateRef.current, tier)
    reachableSetCacheRef.current = {
      revision,
      tier,
      reachable,
    }
    const unlocked = permanentlyUnlockedReachableRef.current
    for (const key of reachable) {
      unlocked.add(key)
    }
    return unlocked
  }

  const toSimulationDynamicStateSnapshot = (): SimulationDynamicState => {
    const state = gameStateRef.current
    return {
      belts: state.belts,
      items: state.items,
      oreDeposits: state.oreDeposits,
      miners: state.miners,
      hubs: state.hubs,
      inventory: state.inventory,
      materials: state.materials,
      unlocked: state.unlocked,
      storageBuildings: state.storageBuildings,
      nextId: state.nextId,
    }
  }

  const toProcessingMachineRecord = (): Record<string, ProcessingMachineState> => {
    const record: Record<string, ProcessingMachineState> = {}
    for (const [id, machine] of processingMachinesRef.current.entries()) {
      record[id] = {
        ...machine,
        inputBuffer: { ...machine.inputBuffer },
      }
    }
    return record
  }

  const toPlacedStructureList = (): ProcessingStructureState[] => {
    const structures: ProcessingStructureState[] = []
    for (const [id, structure] of placedStructuresRef.current.entries()) {
      structures.push({
        id,
        buildId: structure.buildId,
        anchor: { ...structure.anchor },
        direction: structure.direction,
      })
    }
    return structures
  }

  const ensureInitialLogisticsHubPlacement = (): boolean => {
    const hasLogisticsHub = Array.from(placedStructuresRef.current.values()).some(
      (structure) => structure.buildId === 'logistics_hub',
    )
    if (hasLogisticsHub) return false
    const coreHub = gameStateRef.current.hubs[0]
    if (!coreHub) return false
    const direction: Direction = 'right'
    const footprint = getStructureFootprint('logistics_hub', direction)
    const anchor = {
      x: coreHub.x - Math.floor(footprint.width / 2),
      y: coreHub.y - Math.floor(footprint.height / 2),
    }
    const anchorKey = toCellKey(anchor.x, anchor.y)
    const occupiedKeys: string[] = []
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
        occupiedKeys.push(toCellKey(anchor.x + offsetX, anchor.y + offsetY))
      }
    }
    placedStructuresRef.current.set(anchorKey, {
      anchor,
      anchorKey,
      buildId: 'logistics_hub',
      direction,
      footprint,
      occupiedKeys,
    })
    for (const key of occupiedKeys) {
      occupiedStructureCellsRef.current.set(key, anchorKey)
    }
    return true
  }

  const centerCameraOnStartingHub = (force = false): boolean => {
    if (!force && hasCenteredOnStarterHubRef.current) return false
    const canvas = canvasRef.current
    if (!canvas) return false
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false

    const logisticsHub = Array.from(placedStructuresRef.current.values()).find(
      (structure) => structure.buildId === 'logistics_hub',
    )

    let centerGridX = 0
    let centerGridY = 0
    if (logisticsHub) {
      centerGridX = logisticsHub.anchor.x + logisticsHub.footprint.width * 0.5
      centerGridY = logisticsHub.anchor.y + logisticsHub.footprint.height * 0.5
    } else {
      const coreHub = gameStateRef.current.hubs[0]
      if (!coreHub) return false
      centerGridX = coreHub.x + 0.5
      centerGridY = coreHub.y + 0.5
    }

    const centerWorldX = centerGridX * BASE_CELL_SIZE
    const centerWorldY = centerGridY * BASE_CELL_SIZE
    const scale = scaleRef.current
    offsetRef.current = {
      x: rect.width * 0.5 - centerWorldX * scale,
      y: rect.height * 0.5 - centerWorldY * scale,
    }
    hasCenteredOnStarterHubRef.current = true
    return true
  }

  const publishMultiplayerState = useCallback(() => {
    if (!multiplayerEnabled) return
    const publish = onMultiplayerStateChangeRef.current
    if (!publish) return
    const includeStaticWorld = staticWorldSyncNeededRef.current
    publish(
      buildMultiplayerSnapshot({
        gameState: gameStateRef.current,
        placedStructures: placedStructuresRef.current,
        refundableBuilds: refundableBuildsRef.current,
        processingMachines: processingMachinesRef.current,
      }, {
        includeStaticWorld,
      }),
    )
    if (includeStaticWorld) {
      staticWorldSyncNeededRef.current = false
    }
  }, [multiplayerEnabled])

  const applySimulationResult = (result: ReturnType<typeof simulateStep>, timestampSec: number) => {
    const state = gameStateRef.current
    state.belts = result.state.belts
    state.items = result.state.items
    state.oreDeposits = result.state.oreDeposits
    state.miners = result.state.miners
    state.hubs = result.state.hubs
    state.inventory = result.state.inventory
    state.materials = result.state.materials
    state.unlocked = result.state.unlocked
    state.storageBuildings = result.state.storageBuildings
    state.nextId = result.state.nextId

    const nextMachines = new Map<string, ProcessingMachineState>()
    for (const [id, machine] of Object.entries(result.processingMachines)) {
      nextMachines.set(id, {
        ...machine,
        inputBuffer: { ...machine.inputBuffer },
      })
    }
    processingMachinesRef.current = nextMachines
    powerTelemetryRef.current = result.power ?? EMPTY_POWER_TELEMETRY

    emitSelectedMachine()
    emitEconomy(result.economyChanged)
    const shouldEmitTiming =
      result.craftedAny || result.economyChanged || timestampSec - lastTimingEmitSecRef.current >= 0.15
    if (shouldEmitTiming) {
      emitTiming(timestampSec, result.craftedAny || result.economyChanged)
      lastTimingEmitSecRef.current = timestampSec
    }
  }

  const scheduleSimulationStep = (dtSec: number, timestampSec: number) => {
    if (dtSec > 0) {
      simulationPendingDeltaSecRef.current = Math.min(0.12, simulationPendingDeltaSecRef.current + dtSec)
    }
    if (simulationInFlightRef.current) return

    const pendingDt = simulationPendingDeltaSecRef.current
    if (pendingDt <= 0) return
    simulationPendingDeltaSecRef.current = 0

    const inputVersion = simulationInputVersionRef.current
    const requestId = simulationRequestIdRef.current + 1
    simulationRequestIdRef.current = requestId
    const accessibleValleyTier = resolveCurrentAccessibleBridgeTier()
    const message: SimulationWorkerStepMessage = {
      type: 'step',
      requestId,
      inputVersion,
      dtSec: pendingDt,
      accessibleValleyTier,
      state: toSimulationDynamicStateSnapshot(),
      processingMachines: toProcessingMachineRecord(),
      placedStructures: toPlacedStructureList(),
    }

    const worker = simulationWorkerRef.current
    if (!worker) {
      const result = simulateStep({
        dtSec: message.dtSec,
        accessibleValleyTier: message.accessibleValleyTier,
        state: message.state,
        processingMachines: message.processingMachines,
        placedStructures: message.placedStructures,
      })
      if (inputVersion === simulationInputVersionRef.current) {
        applySimulationResult(result, timestampSec)
      }
      return
    }

    simulationInFlightRef.current = true
    worker.postMessage(message)
  }

  const runSimulationStepSynchronously = (dtSec: number, timestampSec: number) => {
    const result = simulateStep({
      dtSec,
      accessibleValleyTier: resolveCurrentAccessibleBridgeTier(),
      state: toSimulationDynamicStateSnapshot(),
      processingMachines: toProcessingMachineRecord(),
      placedStructures: toPlacedStructureList(),
    })
    applySimulationResult(result, timestampSec)
  }

  const processLockstepTicks = (timestampSec: number) => {
    const drain = drainLockstepTicksRef.current
    if (drain) {
      const incoming = drain()
      const receivedAtMs = readNowMs()
      for (const packet of incoming) {
        pendingLockstepCommandsByTickRef.current.set(packet.tick, packet.commands)
        const nextServerTick = packet.tick + 1
        lockstepCurrentServerTickRef.current = Math.max(lockstepCurrentServerTickRef.current, nextServerTick)
        lockstepClockAnchorRef.current = {
          serverTick: nextServerTick,
          receivedAtMs,
        }
      }
    }

    const nextTick = lockstepNextTickRef.current
    if (nextTick === null) return
    const backlogTicks = lockstepCurrentServerTickRef.current - nextTick
    if (skipLockstepCatchupRef.current || backlogTicks > MAX_LOCKSTEP_CATCHUP_TICKS) {
      const targetTick = Math.max(nextTick, lockstepCurrentServerTickRef.current)
      for (const pendingTick of pendingLockstepCommandsByTickRef.current.keys()) {
        if (pendingTick < targetTick) {
          pendingLockstepCommandsByTickRef.current.delete(pendingTick)
        }
      }
      lockstepNextTickRef.current = targetTick
      skipLockstepCatchupRef.current = false
      return
    }

    let processed = 0
    while (processed < 12) {
      const tick = lockstepNextTickRef.current
      if (tick === null) break
      const commands = pendingLockstepCommandsByTickRef.current.get(tick)
      if (!commands) break
      pendingLockstepCommandsByTickRef.current.delete(tick)

      let changed = false
      for (const command of commands) {
        changed = applyLockstepCommand(command) || changed
      }
      if (changed) {
        markSimulationInputDirty()
        emitEconomy(true)
        emitSelectedMachine(true)
      }

      runSimulationStepSynchronously(lockstepTickIntervalSecRef.current, timestampSec)
      lockstepNextTickRef.current = tick + 1
      lockstepCurrentServerTickRef.current = Math.max(lockstepCurrentServerTickRef.current, tick + 1)
      processed += 1
    }
  }

  const clearTerrainRasterCache = () => {
    for (const cached of terrainRasterCacheRef.current.values()) {
      for (const bitmap of cached.bitmaps) {
        bitmap.close()
      }
    }
    terrainRasterCacheRef.current.clear()
    terrainRasterReadyRef.current = false
  }

  const requestTerrainRasterBuild = (chunks: Map<string, TerrainCell[]>) => {
    const worker = terrainRasterWorkerRef.current
    if (!worker) return
    const palette = getCanvasPalette()
    const buildId = terrainRasterBuildIdRef.current + 1
    terrainRasterBuildIdRef.current = buildId
    clearTerrainRasterCache()
    const chunkPayload = Array.from(chunks.entries()).map(([key, cells]) => {
      const [chunkXRaw, chunkYRaw] = key.split(',')
      const chunkX = Number(chunkXRaw)
      const chunkY = Number(chunkYRaw)
      return {
        key,
        chunkX,
        chunkY,
        cells,
      }
    })
    worker.postMessage({
      type: 'build',
      buildId,
      chunkSize: TERRAIN_CHUNK_SIZE,
      tilePx: 4,
      chunks: chunkPayload,
      palette: {
        accessible: {
          1: palette.terrain[1].fill,
          2: palette.terrain[2].fill,
          3: palette.terrain[3].fill,
          4: palette.terrain[4].fill,
        },
        blocked: palette.terrainBlocked.fill,
      },
    })
  }

  const rebuildTerrainRasterFromCurrentChunks = () => {
    if (terrainChunksRef.current.size === 0) return
    requestTerrainRasterBuild(terrainChunksRef.current)
  }

  const rebuildTerrainChunks = () => {
    const chunks = new Map<string, TerrainCell[]>()
    let count = 0
    for (const [cell, valley] of Object.entries(gameStateRef.current.terrain)) {
      const [xRaw, yRaw] = cell.split(',')
      const x = Number(xRaw)
      const y = Number(yRaw)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      const chunkX = Math.floor(x / TERRAIN_CHUNK_SIZE)
      const chunkY = Math.floor(y / TERRAIN_CHUNK_SIZE)
      const key = terrainChunkKey(chunkX, chunkY)
      const bucket = chunks.get(key) ?? []
      bucket.push({ x, y, valley })
      chunks.set(key, bucket)
      count += 1
    }
    terrainChunksRef.current = chunks
    terrainTileCountRef.current = count
    requestTerrainRasterBuild(chunks)
  }

  const emitTiming = (timestampSec: number, force = false) => {
    const state = gameStateRef.current
    const machines: MachineTimingMetric[] = []

    for (const [machineId, machine] of processingMachinesRef.current.entries()) {
      const placed = placedStructuresRef.current.get(machineId)
      if (!placed) continue

      const recipe = machine.recipeId ? CRAFT_RECIPES[machine.recipeId] : null
      const inputLaneCounts = getInputLaneCounts(recipe)
      const inputs: MachineTimingInput[] = recipe
        ? Object.entries(recipe.cost).flatMap(([resource, amount]) => {
            if (amount === undefined) return []
            const laneCount = Math.max(1, inputLaneCounts[resource] ?? 1)
            const requiredPerSecond = amount / machine.cycleSec
            return [
              {
                resource,
                amountPerCycle: amount,
                requiredPerSecond,
                lanes: laneCount,
                lanesForOptimal: Math.max(1, Math.ceil(requiredPerSecond / BELT_CELLS_PER_SECOND)),
              },
            ]
          })
        : []

      let supplyRatio = 1
      for (const input of inputs) {
        if (input.requiredPerSecond <= 0) continue
        const laneSupply = input.lanes * BELT_CELLS_PER_SECOND
        supplyRatio = Math.min(supplyRatio, laneSupply / input.requiredPerSecond)
      }

      const outputPerSecond = recipe ? recipe.output.amount / machine.cycleSec : 0
      const outputLanes = recipe ? Math.max(1, Math.ceil(recipe.output.amount)) : 1
      const inputLanes = Object.values(inputLaneCounts).reduce((sum, count) => sum + count, 0)
      const utilization = machine.status === 'crafting' ? Math.min(1, supplyRatio) : 0

      machines.push({
        id: machineId,
        buildId: machine.buildId,
        recipeId: machine.recipeId,
        status: machine.status,
        cycleSec: machine.cycleSec,
        outputResource: recipe?.output.material ?? null,
        outputPerSecond,
        outputLanes,
        utilization,
        inputLanes,
        inputs,
      })
    }

    machines.sort((left, right) => left.id.localeCompare(right.id))

    const machineCode = machines
      .map((machine) => {
        const inputsCode = machine.inputs
          .map(
            (input) =>
              `${input.resource}:${input.amountPerCycle}:${input.lanes}:${input.lanesForOptimal}:${input.requiredPerSecond.toFixed(3)}`,
          )
          .join(',')
        return `${machine.id}:${machine.buildId}:${machine.recipeId ?? 'none'}:${machine.status}:${machine.utilization.toFixed(
          2,
        )}:${machine.outputPerSecond.toFixed(3)}:${inputsCode}`
      })
      .join('|')
    const perf = framePerfRef.current
    const power = powerTelemetryRef.current
    const perfCode = `${perf.fps.toFixed(1)}:${perf.frameMs.toFixed(2)}:${perf.updateMs.toFixed(
      2,
    )}:${perf.drawMs.toFixed(2)}:${perf.terrainTilesVisible}:${perf.drawCallsEstimate}`
    const powerCode = `${power.generated.toFixed(2)}:${power.allocated.toFixed(2)}:${power.surplus.toFixed(
      2,
    )}:${power.deficit.toFixed(2)}`
    const fingerprint = `${state.belts.length}:${state.items.length}:${machineCode}:${perfCode}:${powerCode}`
    if (!force && fingerprint === timingFingerprintRef.current) return
    timingFingerprintRef.current = fingerprint

    onTimingChangeRef.current?.({
      timestampSec,
      beltCellsPerSecond: BELT_CELLS_PER_SECOND,
      belts: state.belts.length,
      itemsInTransit: state.items.length,
      power,
      machines,
      performance: {
        fps: perf.fps,
        frameMs: perf.frameMs,
        updateMs: perf.updateMs,
        drawMs: perf.drawMs,
        terrainTilesTotal: terrainTileCountRef.current,
        terrainTilesVisible: perf.terrainTilesVisible,
        bridgesVisible: perf.bridgesVisible,
        depositsVisible: perf.depositsVisible,
        beltsVisible: perf.beltsVisible,
        minersVisible: perf.minersVisible,
        itemsVisible: perf.itemsVisible,
        structuresVisible: perf.structuresVisible,
        drawCallsEstimate: perf.drawCallsEstimate,
        terrainRasterReady: perf.terrainRasterReady,
        terrainRasterChunks: perf.terrainRasterChunks,
        cameraOptimizationActive: perf.cameraOptimizationActive,
      },
    })
  }

  const emitHoverInspector = (next: HoverInspector | null) => {
    const fingerprint = next
      ? `${next.title}|${next.lines.join('|')}|${next.meter?.label ?? ''}|${next.meter?.value.toFixed(2) ?? ''}|${
          next.meter?.max.toFixed(2) ?? ''
        }`
      : 'none'
    if (fingerprint === hoverInspectorFingerprintRef.current) return
    hoverInspectorFingerprintRef.current = fingerprint
    hoverInspectorStore.setSnapshot(next)
  }

  const emitSelectedMachine = (force = false) => {
    const selectedKey = selectedMachineKeyRef.current
    if (!selectedKey) {
      if (!force && selectedMachineFingerprintRef.current === 'none') return
      selectedMachineFingerprintRef.current = 'none'
      setSelectedMachineView(null)
      return
    }

    const structure = placedStructuresRef.current.get(selectedKey)
    if (!structure || (!isProcessingBuildId(structure.buildId) && !isDepotOutputBuildId(structure.buildId))) {
      selectedMachineKeyRef.current = null
      selectedMachineFingerprintRef.current = 'none'
      setSelectedMachineView(null)
      return
    }

    const machine = processingMachinesRef.current.get(selectedKey)
    const availableRecipeIds = isProcessingBuildId(structure.buildId)
      ? (RECIPES_BY_STATION[structure.buildId] ?? [])
      : []

    const view: SelectedProductionConfigView = {
      id: selectedKey,
      buildLabel: buildLabel(structure.buildId),
      targetKind: isProcessingBuildId(structure.buildId) ? 'processor' : 'depot_output',
      statusLabel: machine ? machineStatusLabel(machine.status) : 'ready',
      mode: machine?.selectedRecipeId ? 'manual' : 'auto',
      selectedRecipeId: isProcessingBuildId(structure.buildId) ? (machine?.selectedRecipeId ?? null) : undefined,
      activeRecipeId: isProcessingBuildId(structure.buildId) ? (machine?.recipeId ?? null) : undefined,
      availableRecipeIds: isProcessingBuildId(structure.buildId) ? [...availableRecipeIds] : undefined,
      selectedOutputResource: isDepotOutputBuildId(structure.buildId) ? (machine?.depotOutputResource ?? null) : undefined,
      activeOutputResource: isDepotOutputBuildId(structure.buildId) ? (machine?.depotOutputResource ?? null) : undefined,
      availableOutputResources: isDepotOutputBuildId(structure.buildId) ? ALL_RESOURCE_IDS : undefined,
    }

    const fingerprint = `${view.id}|${view.statusLabel}|${view.mode}|${view.selectedRecipeId ?? 'auto'}|${
      view.activeRecipeId ?? 'none'
    }|${(view.availableRecipeIds ?? []).join(',')}|${view.targetKind}|${view.selectedOutputResource ?? 'auto'}|${
      view.activeOutputResource ?? 'auto'
    }|${(view.availableOutputResources ?? []).join(',')}`
    if (!force && selectedMachineFingerprintRef.current === fingerprint) return
    selectedMachineFingerprintRef.current = fingerprint
    setSelectedMachineView(view)
  }

  const clearSelectedMachine = useCallback(() => {
    selectedMachineKeyRef.current = null
    selectedMachineFingerprintRef.current = 'none'
    setSelectedMachineView(null)
  }, [])

  const queueLockstepCommand = useCallback(
    (payload: LockstepCommandPayload): boolean => {
      if (!multiplayerEnabled) return false
      const publish = onMultiplayerCommandRef.current
      const nextTick = lockstepNextTickRef.current
      if (!publish || nextTick === null) return false

      const nowMs = readNowMs()
      const intervalMs = Math.max(1, lockstepTickIntervalSecRef.current * 1000)
      const anchor = lockstepClockAnchorRef.current
      const estimatedServerTick = anchor
        ? Math.max(
            lockstepCurrentServerTickRef.current,
            anchor.serverTick + Math.floor(Math.max(0, nowMs - anchor.receivedAtMs) / intervalMs),
          )
        : lockstepCurrentServerTickRef.current
      const baseTick = Math.max(estimatedServerTick, nextTick, lastQueuedLockstepTickRef.current)
      const targetTick = baseTick + LOCKSTEP_INPUT_DELAY_TICKS
      publish({
        tick: targetTick,
        command: payload,
      })
      lastQueuedLockstepTickRef.current = targetTick
      return true
    },
    [multiplayerEnabled],
  )

  const setSelectedMachineOption = useCallback(
    (selectedValue: string | null) => {
      if (multiplayerEnabled && lockstepNextTickRef.current === null) {
        return
      }
      const selectedKey = selectedMachineKeyRef.current
      if (!selectedKey) return
      const structure = placedStructuresRef.current.get(selectedKey)
      if (!structure || (!isProcessingBuildId(structure.buildId) && !isDepotOutputBuildId(structure.buildId))) return
      const allowedOptions = isProcessingBuildId(structure.buildId)
        ? (RECIPES_BY_STATION[structure.buildId] ?? [])
        : ALL_RESOURCE_IDS
      if (selectedValue !== null && !allowedOptions.includes(selectedValue)) return

      if (
        queueLockstepCommand({
          type: 'set_machine_recipe',
          machineKey: selectedKey,
          recipeId: selectedValue,
        })
      ) {
        return
      }

      const existingMachine = processingMachinesRef.current.get(selectedKey)
      const machine: ProcessingMachineState =
        existingMachine ??
        {
          buildId: structure.buildId,
          recipeId: null,
          selectedRecipeId: null,
          inputBuffer: {},
          cycleSec: getProcessingCycleSec(structure.buildId) ?? 2.8,
          cooldownSec: 0,
          status: 'idle',
          depotOutputResource: null,
        }
      if (isProcessingBuildId(structure.buildId)) {
        const recipeId = selectedValue as CraftRecipeId | null
        machine.selectedRecipeId = recipeId
        if (recipeId) machine.recipeId = recipeId
      } else if (isDepotOutputBuildId(structure.buildId)) {
        machine.depotOutputResource = selectedValue
      }
      machine.cooldownSec = 0
      machine.status = 'idle'
      processingMachinesRef.current.set(selectedKey, machine)
      markSimulationInputDirty()
      emitSelectedMachine(true)
      publishMultiplayerState()
    },
    [multiplayerEnabled, publishMultiplayerState, queueLockstepCommand],
  )

  const selectMachineAtCell = useCallback((cell: Point | null) => {
    if (!cell) {
      clearSelectedMachine()
      return
    }
    const cellKey = toCellKey(cell.x, cell.y)
    const anchorKey = occupiedStructureCellsRef.current.get(cellKey) ?? cellKey
    const structure = placedStructuresRef.current.get(anchorKey)
    if (!structure || (!isProcessingBuildId(structure.buildId) && !isDepotOutputBuildId(structure.buildId))) {
      clearSelectedMachine()
      return
    }
    selectedMachineKeyRef.current = anchorKey
    emitSelectedMachine(true)
  }, [clearSelectedMachine])

  const readCellFromPointer = (clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const screenPoint = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
    const world = screenToWorld(screenPoint, {
      scale: scaleRef.current,
      offset: offsetRef.current,
    })
    return worldToGrid(world)
  }

  const clearPlacementDrag = () => {
    const drag = placementDragRef.current
    drag.active = false
    drag.anchorCell = null
    drag.previewSteps = []
  }

  const updatePlacementPreview = (cell: Point, axisLock: boolean) => {
    const drag = placementDragRef.current
    const intent = placementIntentRef.current
    if (!drag.active || !drag.anchorCell || !canPlace(intent)) return

    drag.previewSteps = buildPlacementPath(drag.anchorCell, cell, axisLock, placementDirectionRef.current)
  }

  const showPlacementFeedback = useCallback((message: string) => {
    setPlacementFeedback(message)
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setPlacementFeedback(null)
      feedbackTimeoutRef.current = null
    }, PLACEMENT_FEEDBACK_DURATION_MS)
  }, [])

  const setRelayPlacementStatusSnapshot = useCallback((next: RelayPlacementStatus | null) => {
    const fingerprint = next ? `${next.tone}|${next.message}` : 'none'
    if (fingerprint === relayPlacementStatusFingerprintRef.current) return
    relayPlacementStatusFingerprintRef.current = fingerprint
    setRelayPlacementStatus(next)
  }, [])

  const applyLockstepCommand = useCallback(
    (envelope: LockstepCommandEnvelope): boolean => {
      const payload = envelope.command
      if (payload.type === 'place_steps') {
        const state = gameStateRef.current
        const unlockedTier = maxUnlockedBridgeTier(state.unlocked)
        const accessibleTier = resolveCurrentAccessibleBridgeTier()
        const tierContext = {
          accessibleTier,
          placeableTier: Math.min(Math.max(1, unlockedTier), Math.max(1, accessibleTier) + 1),
        }
        const context = {
          state,
          placedStructures: placedStructuresRef.current,
          occupiedStructureCells: occupiedStructureCellsRef.current,
          refundableBuilds: refundableBuildsRef.current,
          bridgeTierContext: tierContext,
          reachable: resolveCurrentReachableSet(accessibleTier),
        }
        const uniqueSteps = dedupeSerializedPlacementSteps(payload.steps)
        let changed = false

        if (isBridgeBuildId(payload.buildId)) {
          let remaining = [...uniqueSteps]
          while (remaining.length > 0) {
            const nextRemaining: SerializedPlacementStep[] = []
            let passChanged = false
            for (const step of remaining) {
              const placed = tryPlaceBuildAt(
                context,
                { x: step.x, y: step.y },
                payload.buildId,
                step.direction,
              )
              if (placed) {
                changed = true
                passChanged = true
                continue
              }
              nextRemaining.push(step)
            }
            if (!passChanged) break
            remaining = nextRemaining
          }
          if (changed) {
            markReachabilityTopologyDirty()
          }
          return changed
        }

        for (const step of uniqueSteps) {
          const placed = tryPlaceBuildAt(
            context,
            { x: step.x, y: step.y },
            payload.buildId,
            step.direction,
          )
          if (!placed) continue
          changed = true
        }
        if (changed && isBridgeBuildId(payload.buildId)) {
          markReachabilityTopologyDirty()
        }
        return changed
      }

      if (payload.type === 'remove_cell') {
        const bridgeCountBefore = Object.keys(gameStateRef.current.bridges).length
        const structureAnchorKey = occupiedStructureCellsRef.current.get(toCellKey(payload.cell.x, payload.cell.y))
        const removed = removeBuildAt(
          {
            state: gameStateRef.current,
            placedStructures: placedStructuresRef.current,
            occupiedStructureCells: occupiedStructureCellsRef.current,
            refundableBuilds: refundableBuildsRef.current,
          },
          payload.cell,
        )
        if (removed && structureAnchorKey && selectedMachineKeyRef.current === structureAnchorKey) {
          clearSelectedMachine()
        }
        if (removed && Object.keys(gameStateRef.current.bridges).length !== bridgeCountBefore) {
          markReachabilityTopologyDirty()
        }
        return removed
      }

      if (payload.type === 'set_machine_recipe') {
        const structure = placedStructuresRef.current.get(payload.machineKey)
        if (!structure || (!isProcessingBuildId(structure.buildId) && !isDepotOutputBuildId(structure.buildId))) {
          return false
        }
        const allowedOptions = isProcessingBuildId(structure.buildId)
          ? (RECIPES_BY_STATION[structure.buildId] ?? [])
          : ALL_RESOURCE_IDS
        if (payload.recipeId !== null && !allowedOptions.includes(payload.recipeId)) return false
        const existingMachine = processingMachinesRef.current.get(payload.machineKey)
        const machine: ProcessingMachineState =
          existingMachine ??
          {
            buildId: structure.buildId,
            recipeId: null,
            selectedRecipeId: null,
            inputBuffer: {},
            cycleSec: getProcessingCycleSec(structure.buildId) ?? 2.8,
            cooldownSec: 0,
            status: 'idle',
            depotOutputResource: null,
          }
        if (isProcessingBuildId(structure.buildId)) {
          machine.selectedRecipeId = payload.recipeId as CraftRecipeId | null
          if (payload.recipeId) machine.recipeId = payload.recipeId as CraftRecipeId
        } else if (isDepotOutputBuildId(structure.buildId)) {
          machine.depotOutputResource = payload.recipeId
        }
        machine.cooldownSec = 0
        machine.status = 'idle'
        processingMachinesRef.current.set(payload.machineKey, machine)
        return true
      }

      return false
    },
    [clearSelectedMachine],
  )

  const commitPlacementPreview = (): PlacementCommitResult => {
    if (multiplayerEnabled && lockstepNextTickRef.current === null) {
      return { changed: false, reason: 'syncing multiplayer...' }
    }
    const drag = placementDragRef.current
    const intent = placementIntentRef.current
    if (!drag.active || !drag.anchorCell || !canPlace(intent)) {
      return { changed: false, reason: null }
    }

    const steps =
      drag.previewSteps.length > 0
        ? drag.previewSteps
        : buildPlacementPath(drag.anchorCell, drag.anchorCell, false, placementDirectionRef.current)
    const uniqueSteps = dedupePlacementPathSteps(steps)

    if (
      queueLockstepCommand({
        type: 'place_steps',
        buildId: intent.selectedBuildId,
        steps: uniqueSteps.map((step) => ({
          x: step.cell.x,
          y: step.cell.y,
          direction: step.direction,
        })),
      })
    ) {
      return { changed: true, reason: null }
    }

    const placedKeys = new Set<string>()
    let changed = false
    let firstFailureReason: string | null = null
    const state = gameStateRef.current
    const unlockedTier = maxUnlockedBridgeTier(state.unlocked)
    const accessibleTier = resolveCurrentAccessibleBridgeTier()
    const tierContext = {
      accessibleTier,
      placeableTier: Math.min(Math.max(1, unlockedTier), Math.max(1, accessibleTier) + 1),
    }
    const context = {
      state,
      placedStructures: placedStructuresRef.current,
      occupiedStructureCells: occupiedStructureCellsRef.current,
      refundableBuilds: refundableBuildsRef.current,
      bridgeTierContext: tierContext,
      reachable: resolveCurrentReachableSet(accessibleTier),
    }

    if (isBridgeBuildId(intent.selectedBuildId)) {
      let remaining = [...uniqueSteps]
      while (remaining.length > 0) {
        let passChanged = false
        const nextRemaining: PlacementPathStep[] = []
        for (const step of remaining) {
          const key = toCellKey(step.cell.x, step.cell.y)
          if (placedKeys.has(key)) continue
          const placed = tryPlaceBuildAt(
            context,
            step.cell,
            intent.selectedBuildId,
            step.direction,
          )
          if (placed) {
            placedKeys.add(key)
            changed = true
            passChanged = true
            continue
          }
          if (!firstFailureReason) {
            firstFailureReason = getPlacementFailureReason(
              context,
              step.cell,
              intent.selectedBuildId,
              step.direction,
            )
          }
          nextRemaining.push(step)
        }
        if (!passChanged) break
        remaining = nextRemaining
      }
    } else {
      for (const step of uniqueSteps) {
        const key = toCellKey(step.cell.x, step.cell.y)
        if (placedKeys.has(key)) continue
        const placed = tryPlaceBuildAt(
          context,
          step.cell,
          intent.selectedBuildId,
          step.direction,
        )
        if (!placed) {
          if (!firstFailureReason) {
            firstFailureReason = getPlacementFailureReason(
              context,
              step.cell,
              intent.selectedBuildId,
              step.direction,
            )
          }
          continue
        }
        placedKeys.add(key)
        changed = true
      }
    }

    if (changed) {
      if (isBridgeBuildId(intent.selectedBuildId)) {
        markReachabilityTopologyDirty()
      }
      markSimulationInputDirty()
      emitEconomy(true)
      publishMultiplayerState()
    }
    if (changed) return { changed: true, reason: null }
    return { changed: false, reason: firstFailureReason ?? 'cannot place here!' }
  }

  const removeAtCell = (cell: Point) => {
    if (multiplayerEnabled && lockstepNextTickRef.current === null) {
      return
    }
    if (
      queueLockstepCommand({
        type: 'remove_cell',
        cell: { x: cell.x, y: cell.y },
      })
    ) {
      return
    }

    const cellKey = toCellKey(cell.x, cell.y)
    const structureAnchorKey = occupiedStructureCellsRef.current.get(cellKey) ?? cellKey
    const bridgeCountBefore = Object.keys(gameStateRef.current.bridges).length
    const removed = removeBuildAt(
      {
        state: gameStateRef.current,
        placedStructures: placedStructuresRef.current,
        occupiedStructureCells: occupiedStructureCellsRef.current,
        refundableBuilds: refundableBuildsRef.current,
      },
      cell,
    )
    if (removed) {
      if (Object.keys(gameStateRef.current.bridges).length !== bridgeCountBefore) {
        markReachabilityTopologyDirty()
      }
      markSimulationInputDirty()
      if (selectedMachineKeyRef.current === structureAnchorKey) {
        clearSelectedMachine()
      }
      emitEconomy(true)
      publishMultiplayerState()
    }
  }

  const emitLocalPresence = useCallback(
    (cell: Point | null) => {
      if (!multiplayerEnabled) return
      const publish = onLocalPresenceUpdateRef.current
      if (!publish) return

      const currentPlacement = placementIntentRef.current
      const placingNow = canPlace(currentPlacement)
      const payload: LocalPlayerPresenceUpdate = {
        cursorCell: cell ? { x: cell.x, y: cell.y } : null,
        placementCell: placingNow && cell ? { x: cell.x, y: cell.y } : null,
        placementBuildId: placingNow ? currentPlacement.selectedBuildId : null,
        placementDirection: placingNow ? placementDirectionRef.current : null,
      }
      const fingerprint = `${payload.cursorCell?.x ?? 'n'},${payload.cursorCell?.y ?? 'n'}|${
        payload.placementCell?.x ?? 'n'
      },${payload.placementCell?.y ?? 'n'}|${payload.placementBuildId ?? 'none'}|${
        payload.placementDirection ?? 'none'
      }`
      if (fingerprint === lastLocalPresenceFingerprintRef.current) return
      lastLocalPresenceFingerprintRef.current = fingerprint
      publish(payload)
    },
    [multiplayerEnabled],
  )

  useEffect(() => {
    if (!multiplayerEnabled || !multiplayerSnapshot) return
    const normalized = normalizeMultiplayerSnapshot(multiplayerSnapshot, gameStateRef.current)
    if (!normalized) return
    if (normalized.updatedAtMs > 0 && normalized.updatedAtMs <= lastAppliedMultiplayerUpdateAtRef.current) {
      return
    }

    gameStateRef.current = normalized.gameState
    placedStructuresRef.current = normalized.placedStructures
    occupiedStructureCellsRef.current = normalized.occupiedStructureCells
    refundableBuildsRef.current = normalized.refundableBuilds
    processingMachinesRef.current = normalized.processingMachines
    const injectedStarterHub = ensureInitialLogisticsHubPlacement()
    centerCameraOnStartingHub()
    simulationPendingDeltaSecRef.current = 0
    markSimulationInputDirty()
    clearPlacementDrag()
    hoveredCellRef.current = null
    emitHoverInspector(null)
    emitSelectedMachine(true)
    if (multiplayerSnapshot.staticWorld) {
      rebuildTerrainChunks()
      staticWorldSyncNeededRef.current = false
    }
    emitEconomy(true)
    const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001
    emitTiming(nowSec, true)
    if (injectedStarterHub) {
      publishMultiplayerState()
    }

    lastAppliedMultiplayerUpdateAtRef.current =
      normalized.updatedAtMs > 0 ? normalized.updatedAtMs : Date.now()
  }, [multiplayerEnabled, multiplayerSnapshot])

  useEffect(() => {
    placementIntentRef.current = placementIntent
    emitLocalPresence(hoveredCellRef.current)
  }, [emitLocalPresence, placementIntent])

  useEffect(() => {
    placementDirectionRef.current = placementDirection
    emitLocalPresence(hoveredCellRef.current)
  }, [emitLocalPresence, placementDirection])

  useEffect(() => {
    inputSystemRef.current = inputSystem
  }, [inputSystem])

  useEffect(() => {
    if (canPlace(placementIntent)) return
    const drag = placementDragRef.current
    drag.active = false
    drag.anchorCell = null
    drag.previewSteps = []
  }, [placementIntent])

  useEffect(() => {
    const unsubscribe = inputSystem.onPress((action) => {
      if (action !== 'cancel_placement') return
      const drag = placementDragRef.current
      drag.active = false
      drag.anchorCell = null
      drag.previewSteps = []
    })
    return unsubscribe
  }, [inputSystem])

  useEffect(() => {
    onEconomyChangeRef.current = onEconomyChange
  }, [onEconomyChange])

  useEffect(() => {
    onTimingChangeRef.current = onTimingChange
  }, [onTimingChange])

  useEffect(() => {
    onProgressionTierChangeRef.current = onProgressionTierChange
  }, [onProgressionTierChange])

  useEffect(() => {
    onMultiplayerStateChangeRef.current = onMultiplayerStateChange
  }, [onMultiplayerStateChange])

  useEffect(() => {
    onMultiplayerCommandRef.current = onMultiplayerCommand
  }, [onMultiplayerCommand])

  useEffect(() => {
    drainLockstepTicksRef.current = drainLockstepTicks
  }, [drainLockstepTicks])

  useEffect(() => {
    onLocalPresenceUpdateRef.current = onLocalPresenceUpdate
  }, [onLocalPresenceUpdate])

  useEffect(() => {
    remotePresencesRef.current = remotePresences
  }, [remotePresences])

  useEffect(() => {
    overlaySettingsRef.current = overlaySettings
  }, [overlaySettings])

  useEffect(() => {
    if (!multiplayerEnabled || !lockstepBootstrap) {
      lockstepCurrentServerTickRef.current = 0
      lockstepNextTickRef.current = null
      lockstepClockAnchorRef.current = null
      lastQueuedLockstepTickRef.current = 0
      pendingLockstepCommandsByTickRef.current.clear()
      return
    }
    lockstepTickIntervalSecRef.current = Math.max(10, lockstepBootstrap.tickIntervalMs) * 0.001
    lockstepCurrentServerTickRef.current = lockstepBootstrap.currentTick
    lockstepNextTickRef.current = lockstepBootstrap.currentTick
    lockstepClockAnchorRef.current = {
      serverTick: lockstepBootstrap.currentTick,
      receivedAtMs: readNowMs(),
    }
    lastQueuedLockstepTickRef.current = lockstepBootstrap.currentTick
    pendingLockstepCommandsByTickRef.current.clear()
  }, [lockstepBootstrap, multiplayerEnabled])

  useEffect(() => {
    if (!multiplayerEnabled) {
      lastSnapshotRequestVersionRef.current = snapshotRequestVersion
      return
    }
    if (snapshotRequestVersion === lastSnapshotRequestVersionRef.current) return
    lastSnapshotRequestVersionRef.current = snapshotRequestVersion
    staticWorldSyncNeededRef.current = true
    publishMultiplayerState()
  }, [multiplayerEnabled, publishMultiplayerState, snapshotRequestVersion])

  useEffect(() => {
    if (multiplayerEnabled) return
    lastLocalPresenceFingerprintRef.current = ''
    onLocalPresenceUpdateRef.current?.(null)
  }, [multiplayerEnabled])

  useEffect(() => {
    return () => {
      onLocalPresenceUpdateRef.current?.(null)
    }
  }, [])

  useEffect(() => {
    const image = new Image()
    image.decoding = 'async'
    image.src = '/assets/cats/maxwellcat.png'
    maxwellImageRef.current = image
    return () => {
      maxwellImageRef.current = null
    }
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
      type: 'module',
    })
    simulationWorkerRef.current = worker

    const onMessage = (event: MessageEvent<SimulationWorkerStepResultMessage>) => {
      const message = event.data
      if (message.type !== 'step_result') return
      simulationInFlightRef.current = false
      if (message.inputVersion !== simulationInputVersionRef.current) return

      const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001
      applySimulationResult(message.result, nowSec)
      if (simulationPendingDeltaSecRef.current > 0) {
        scheduleSimulationStep(0, nowSec)
      }
    }
    const onError = () => {
      simulationInFlightRef.current = false
      worker.terminate()
      simulationWorkerRef.current = null
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    return () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      worker.terminate()
      simulationWorkerRef.current = null
      simulationInFlightRef.current = false
      simulationPendingDeltaSecRef.current = 0
    }
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('../workers/terrainRaster.worker.ts', import.meta.url), {
      type: 'module',
    })
    terrainRasterWorkerRef.current = worker
    worker.postMessage({
      type: 'setTileset',
      definition: TERRAIN_TILESET_DEFINITION,
    })

    const onMessage = (event: MessageEvent<TerrainRasterWorkerChunkMessage | TerrainRasterWorkerDoneMessage>) => {
      const message = event.data
      if (message.type === 'chunk') {
        if (message.buildId !== terrainRasterBuildIdRef.current) {
          for (const bitmap of message.bitmaps) bitmap.close()
          return
        }
        terrainRasterCacheRef.current.set(message.key, {
          terrainCount: message.terrainCount,
          bitmaps: message.bitmaps,
        })
        return
      }
      if (message.type === 'done' && message.buildId === terrainRasterBuildIdRef.current) {
        terrainRasterReadyRef.current = true
      }
    }

    worker.addEventListener('message', onMessage)
    return () => {
      worker.removeEventListener('message', onMessage)
      worker.terminate()
      terrainRasterWorkerRef.current = null
      clearTerrainRasterCache()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadTileset = async () => {
      const loaded = await loadTerrainTilesetBitmaps()
      if (cancelled) {
        closeTerrainTilesetBitmaps(loaded)
        return
      }
      closeTerrainTilesetBitmaps(terrainTilesetRef.current)
      terrainTilesetRef.current = loaded
      rebuildTerrainRasterFromCurrentChunks()
    }

    void loadTileset()
    return () => {
      cancelled = true
      closeTerrainTilesetBitmaps(terrainTilesetRef.current)
      terrainTilesetRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadBuildingSprites = async () => {
      const loaded = await loadBuildingSpriteBitmaps()
      if (cancelled) {
        closeBuildingSpriteBitmaps(loaded)
        return
      }
      closeBuildingSpriteBitmaps(buildingSpritesRef.current)
      buildingSpritesRef.current = loaded
    }

    void loadBuildingSprites()
    return () => {
      cancelled = true
      closeBuildingSpriteBitmaps(buildingSpritesRef.current)
      buildingSpritesRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadDecorations = async () => {
      const loaded = await loadValleyDecorationBitmaps()
      if (cancelled) {
        closeValleyDecorationBitmaps(loaded)
        return
      }
      closeValleyDecorationBitmaps(valleyDecorationsRef.current)
      valleyDecorationsRef.current = loaded
    }

    void loadDecorations()
    return () => {
      cancelled = true
      closeValleyDecorationBitmaps(valleyDecorationsRef.current)
      valleyDecorationsRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSprites = async () => {
      const loaded = await loadOreSpriteBitmaps()
      if (cancelled) {
        closeOreSpriteBitmaps(loaded)
        return
      }
      closeOreSpriteBitmaps(oreSpritesRef.current)
      oreSpritesRef.current = loaded
    }

    void loadSprites()
    return () => {
      cancelled = true
      closeOreSpriteBitmaps(oreSpritesRef.current)
      oreSpritesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!onBindActions) return
    const knownBuildIds = new Set<string>(BUILDABLE_IDS)
    const regenerateWorld = (seed?: number) => {
      const sourceSeed = seed ?? gameStateRef.current.valleySeed
      if (!Number.isFinite(sourceSeed) || sourceSeed < 0) {
        return { ok: false, message: 'seed must be a non-negative number' }
      }

      const resolvedSeed = Math.floor(sourceSeed)
      const unlocked = { ...gameStateRef.current.unlocked }

      const nextState = createState()
      nextState.valleySeed = resolvedSeed
      nextState.unlocked = { ...nextState.unlocked, ...unlocked }

      gameStateRef.current = nextState
      permanentlyUnlockedReachableRef.current.clear()
      maxAccessibleBridgeTierRef.current = 1
      reachableSetCacheRef.current = { revision: -1, tier: -1, reachable: new Set<string>() }
      placedStructuresRef.current.clear()
      occupiedStructureCellsRef.current.clear()
      refundableBuildsRef.current.clear()
      processingMachinesRef.current.clear()
      simulationInFlightRef.current = false
      simulationPendingDeltaSecRef.current = 0
      markReachabilityTopologyDirty()
      markSimulationInputDirty()
      clearPlacementDrag()
      panDragRef.current.active = false
      hoveredCellRef.current = null
      emitHoverInspector(null)
      selectedMachineKeyRef.current = null
      selectedMachineFingerprintRef.current = 'none'
      setSelectedMachineView(null)
      maxwellSpriteRef.current.active = false
      maxwellSpriteRef.current.nextSpawnSec = 8 + Math.random() * 14
      staticWorldSyncNeededRef.current = true
      setPlacementFeedback(null)
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
        feedbackTimeoutRef.current = null
      }

      seedDemoWorld(gameStateRef.current)
      ensureInitialLogisticsHubPlacement()
      centerCameraOnStartingHub(true)
      rebuildTerrainChunks()

      lastTimeRef.current = null
      lastFramePerfTimeRef.current = null
      economyFingerprintRef.current = ''
      timingFingerprintRef.current = ''
      emitEconomy(true)
      const nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001
      emitTiming(nowSec, true)
      publishMultiplayerState()
      return { ok: true, message: `world regenerated (seed ${resolvedSeed})` }
    }

    const actions: GameCanvasActions = {
      craft: (recipeId) => {
        const crafted = craftRecipe(gameStateRef.current, recipeId)
        if (crafted) {
          markSimulationInputDirty()
          emitEconomy(true)
          publishMultiplayerState()
        }
        return crafted
      },
      unlock: (buildId) => {
        const unlocked = unlockBuild(gameStateRef.current, buildId)
        if (unlocked) {
          markSimulationInputDirty()
          emitEconomy(true)
          publishMultiplayerState()
        }
        return unlocked
      },
      debug: {
        addResource: (resource, amount) => {
          if (!Number.isFinite(amount) || amount <= 0) {
            return { ok: false, message: 'amount must be a positive number' }
          }
          const key = resource.trim().toLowerCase()
          if (!KNOWN_RESOURCE_IDS.has(key)) {
            return { ok: false, message: `unknown resource '${resource}'` }
          }
          const added = addResourceToState(gameStateRef.current, key, amount)
          if (added > 0) {
            markSimulationInputDirty()
            publishMultiplayerState()
          }
          emitEconomy(true)
          if (added <= 0) return { ok: false, message: `storage full for ${key}` }
          return { ok: true, message: `added ${added}/${amount} ${key}` }
        },
        fillResources: (mode) => {
          const ratio = mode === 'max' ? 1 : 0.5
          const snapshot = toEconomySnapshot(gameStateRef.current)
          const oreCap = snapshot.storage.orePerResource
          const materialCap = snapshot.storage.materialPerResource
          let addedTotal = 0
          let touched = 0

          for (const resource of KNOWN_RESOURCE_IDS) {
            const isOre = ORE_RESOURCE_IDS.has(resource)
            const cap = isOre ? oreCap : materialCap
            const target = Math.floor(cap * ratio)
            const current = isOre
              ? (gameStateRef.current.inventory[resource as OreType] ?? 0)
              : (gameStateRef.current.materials[resource] ?? 0)
            if (target <= current) continue
            const added = addResourceToState(gameStateRef.current, resource, target - current)
            if (added > 0) {
              touched += 1
              addedTotal += added
            }
          }

          if (addedTotal > 0) {
            markSimulationInputDirty()
            publishMultiplayerState()
          }
          emitEconomy(true)

          const targetLabel = mode === 'max' ? 'max' : 'half'
          return {
            ok: true,
            message: `filled ${touched} resources to ${targetLabel} capacity (+${addedTotal})`,
          }
        },
        setInfiniteCapacity: () => {
          gameStateRef.current.storageBuildings = Math.max(
            gameStateRef.current.storageBuildings,
            DEBUG_INFINITE_STORAGE_BUILDINGS,
          )
          markSimulationInputDirty()
          emitEconomy(true)
          publishMultiplayerState()
          const snapshot = toEconomySnapshot(gameStateRef.current)
          return {
            ok: true,
            message: `capacity boosted (ore ${snapshot.storage.orePerResource}, material ${snapshot.storage.materialPerResource})`,
          }
        },
        unlockBuild: (buildId) => {
          const key = buildId.trim()
          if (!knownBuildIds.has(key)) {
            return { ok: false, message: `unknown build '${buildId}'` }
          }
          gameStateRef.current.unlocked[key as BuildableId] = true
          markSimulationInputDirty()
          emitEconomy(true)
          publishMultiplayerState()
          return { ok: true, message: `unlocked ${key}` }
        },
        unlockAll: () => {
          for (const buildId of BUILDABLE_IDS) {
            gameStateRef.current.unlocked[buildId] = true
          }
          markSimulationInputDirty()
          emitEconomy(true)
          publishMultiplayerState()
          return { ok: true, message: 'unlocked all builds' }
        },
        setBridgeTier: (tier) => {
          const resolvedTier = Math.max(1, Math.min(4, Math.floor(tier)))
          if (!Number.isFinite(tier)) {
            return { ok: false, message: 'tier must be a number 1..4' }
          }
          for (const [bridgeTier, buildId] of Object.entries(BRIDGE_BUILD_BY_TIER)) {
            if (Number(bridgeTier) <= resolvedTier) {
              gameStateRef.current.unlocked[buildId] = true
            }
          }
          markSimulationInputDirty()
          emitEconomy(true)
          publishMultiplayerState()
          return { ok: true, message: `bridge tier set to ${resolvedTier}` }
        },
        regenerateWorld: (seed) => regenerateWorld(seed),
        getWorldSeed: () => gameStateRef.current.valleySeed,
        snapshot: () => toEconomySnapshot(gameStateRef.current),
      },
    }
    onBindActions(actions)
    return () => {
      onBindActions(null)
    }
  }, [onBindActions, publishMultiplayerState])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        skipLockstepCatchupRef.current = true
      }
      lastTimeRef.current = null
      lastFramePerfTimeRef.current = null
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
      zoomMotionUntilMsRef.current = nowMs + CAMERA_NAV_OPTIMIZATION_HOLD_MS
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      const offset = offsetRef.current
      const oldScale = scaleRef.current
      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
      const nextScale = Math.min(3, Math.max(0.45, oldScale * zoomFactor))
      const scaleChange = nextScale / oldScale
      offsetRef.current = {
        x: mouseX - (mouseX - offset.x) * scaleChange,
        y: mouseY - (mouseY - offset.y) * scaleChange,
      }
      scaleRef.current = nextScale
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  useEffect(() => {
    const onWindowMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        const drag = placementDragRef.current
        const intent = placementIntentRef.current
        if (drag.active && drag.anchorCell && canPlace(intent)) {
          const result = commitPlacementPreview()
          if (!result.changed && result.reason) {
            showPlacementFeedback(result.reason)
          }
        }
        drag.active = false
        drag.anchorCell = null
        drag.previewSteps = []
        emitLocalPresence(hoveredCellRef.current)
      }
      if (event.button === 2) {
        panDragRef.current.active = false
        emitLocalPresence(hoveredCellRef.current)
      }
    }

    window.addEventListener('mouseup', onWindowMouseUp)
    return () => {
      window.removeEventListener('mouseup', onWindowMouseUp)
    }
  }, [commitPlacementPreview, emitLocalPresence, showPlacementFeedback])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (gameStateRef.current.oreDeposits.length === 0) {
      permanentlyUnlockedReachableRef.current.clear()
      maxAccessibleBridgeTierRef.current = 1
      reachableSetCacheRef.current = { revision: -1, tier: -1, reachable: new Set<string>() }
      seedDemoWorld(gameStateRef.current)
      ensureInitialLogisticsHubPlacement()
      rebuildTerrainChunks()
      markReachabilityTopologyDirty()
      markSimulationInputDirty()
      emitEconomy(true)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!hasCenteredOnStarterHubRef.current) {
        centerCameraOnStartingHub()
      }
    }

    const draw = (time: number) => {
      const frameStartMs = typeof performance !== 'undefined' ? performance.now() : time
      const previousFrameMs = lastFramePerfTimeRef.current
      const frameDeltaMs = previousFrameMs === null ? 16.67 : Math.max(1, frameStartMs - previousFrameMs)
      lastFramePerfTimeRef.current = frameStartMs

      const canvasPalette = getCanvasPalette()
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const camera: Camera = {
        scale: scaleRef.current,
        offset: offsetRef.current,
      }
      const cellSize = BASE_CELL_SIZE * camera.scale
      const timeSec = time * 0.001
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const isPanning = panDragRef.current.active
      const isZooming = nowMs <= zoomMotionUntilMsRef.current
      const isCameraNavigating = isPanning || isZooming
      if (!isCameraNavigating) {
        visualTimeSecRef.current = timeSec
      }
      const visualTimeSec = visualTimeSecRef.current
      const lastTime = lastTimeRef.current ?? time
      const delta = Math.min(0.05, (time - lastTime) / 1000)
      lastTimeRef.current = time
      const lowDetail = cellSize <= LOW_DETAIL_CELL_SIZE || isCameraNavigating
      const veryLowDetail = cellSize <= VERY_LOW_DETAIL_CELL_SIZE || isCameraNavigating
      const hideItems = cellSize <= HIDE_ITEM_CELL_SIZE || isCameraNavigating
      const useRasterTerrain = (cellSize <= 18 || isCameraNavigating) && terrainRasterReadyRef.current

      let visibleTerrainTiles = 0
      let visibleBridges = 0
      let visibleDeposits = 0
      let visibleBelts = 0
      let visibleMiners = 0
      let visibleItems = 0
      let visibleStructures = 0
      let drawCallsEstimate = 0
      let detailedBeltEffects = 0
      let detailedMinerEffects = 0
      let detailedProcessingStructureEffects = 0
      const queuedDecorationDraws: Array<{
        bitmap: ImageBitmap
        drawX: number
        drawY: number
        drawWidth: number
        drawHeight: number
        depthY: number
      }> = []

      const lockstepReady =
        lockstepNextTickRef.current !== null &&
        drainLockstepTicksRef.current !== undefined &&
        typeof onMultiplayerCommandRef.current === 'function'
      if (multiplayerEnabled) {
        if (lockstepReady) {
          processLockstepTicks(timeSec)
        }
      } else {
        scheduleSimulationStep(delta, timeSec)
      }
      const state = gameStateRef.current
      const unlockedBridgeTier = maxUnlockedBridgeTier(state.unlocked)
      const accessibleBridgeTier = resolveCurrentAccessibleBridgeTier()
      if (accessibleBridgeTier !== lastProgressionTierRef.current) {
        lastProgressionTierRef.current = accessibleBridgeTier
        onProgressionTierChangeRef.current?.(accessibleBridgeTier)
      }
      const simulationSinkCellKeys = new Set<string>()
      for (const structure of placedStructuresRef.current.values()) {
        if (
          !isProcessingBuildId(structure.buildId) &&
          !isDepotInputBuildId(structure.buildId) &&
          !isDepotOutputBuildId(structure.buildId)
        ) {
          continue
        }
        for (let offsetX = 0; offsetX < structure.footprint.width; offsetX += 1) {
          for (let offsetY = 0; offsetY < structure.footprint.height; offsetY += 1) {
            simulationSinkCellKeys.add(toCellKey(structure.anchor.x + offsetX, structure.anchor.y + offsetY))
          }
        }
      }
      const { beltById, beltByCell, beltItemCounts, pausedBeltIds } = computeBeltActivityState(state, {
        sinkCellKeys: simulationSinkCellKeys,
      })
      const oreRichnessByCell = new Map<string, number>()
      for (const oreDeposit of state.oreDeposits) {
        oreRichnessByCell.set(toCellKey(oreDeposit.x, oreDeposit.y), oreDeposit.richness)
      }

      const minGridX = Math.floor((-camera.offset.x / cellSize) - 2)
      const maxGridX = Math.ceil((width - camera.offset.x) / cellSize + 2)
      const minGridY = Math.floor((-camera.offset.y / cellSize) - 2)
      const maxGridY = Math.ceil((height - camera.offset.y) / cellSize + 2)
      const inView = (x: number, y: number) =>
        x >= minGridX && x <= maxGridX && y >= minGridY && y <= maxGridY
      const inViewRect = (x: number, y: number, widthCells: number, heightCells: number) =>
        x + widthCells >= minGridX && x <= maxGridX && y + heightCells >= minGridY && y <= maxGridY
      const minChunkX = Math.floor(minGridX / TERRAIN_CHUNK_SIZE)
      const maxChunkX = Math.floor(maxGridX / TERRAIN_CHUNK_SIZE)
      const minChunkY = Math.floor(minGridY / TERRAIN_CHUNK_SIZE)
      const maxChunkY = Math.floor(maxGridY / TERRAIN_CHUNK_SIZE)
      const updateEndMs = typeof performance !== 'undefined' ? performance.now() : time

      ctx.clearRect(0, 0, width, height)

      const maxwellState = maxwellSpriteRef.current
      if (!isCameraNavigating) {
        if (!maxwellState.active && visualTimeSec >= maxwellState.nextSpawnSec) {
          const fromLeft = Math.random() < 0.5
          const margin = 110
          maxwellState.active = true
          maxwellState.startSec = visualTimeSec
          maxwellState.durationSec = 11 + Math.random() * 8
          maxwellState.fromX = fromLeft ? -margin : width + margin
          maxwellState.toX = fromLeft ? width + margin : -margin
          maxwellState.y = height * (0.08 + Math.random() * 0.68)
          maxwellState.size = 42 + Math.random() * 24
          maxwellState.bobAmplitude = 4 + Math.random() * 8
          maxwellState.bobPhase = Math.random() * Math.PI * 2
        }
        if (maxwellState.active) {
          const progress = (visualTimeSec - maxwellState.startSec) / maxwellState.durationSec
          if (progress >= 1) {
            maxwellState.active = false
            maxwellState.nextSpawnSec = visualTimeSec + 18 + Math.random() * 32
          } else {
            const image = maxwellImageRef.current
            if (image && image.complete) {
              const x = maxwellState.fromX + (maxwellState.toX - maxwellState.fromX) * progress
              const y =
                maxwellState.y +
                Math.sin(progress * Math.PI * 6 + maxwellState.bobPhase) * maxwellState.bobAmplitude
              const rotate = Math.sin(progress * Math.PI * 4 + maxwellState.bobPhase) * 0.08
              const faceLeft = maxwellState.toX < maxwellState.fromX
              ctx.save()
              ctx.translate(x, y)
              ctx.rotate(rotate)
              if (faceLeft) ctx.scale(-1, 1)
              ctx.globalAlpha = 0.92
              ctx.drawImage(
                image,
                -maxwellState.size * 0.5,
                -maxwellState.size * 0.5,
                maxwellState.size,
                maxwellState.size,
              )
              ctx.globalAlpha = 1
              ctx.restore()
              drawCallsEstimate += 1
            }
          }
        }
      }

      const currentPlacement = placementIntentRef.current
      const activePlacement = canPlace(currentPlacement)
      const bridgeTierForTerrain = Math.max(1, Math.min(4, accessibleBridgeTier))
      const terrainTierIndex = bridgeTierForTerrain - 1

      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {
        for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
          const chunkKey = terrainChunkKey(chunkX, chunkY)
          const chunk = terrainChunksRef.current.get(chunkKey)
          if (!chunk) continue

          if (useRasterTerrain) {
            const cached = terrainRasterCacheRef.current.get(chunkKey)
            const bitmap = cached?.bitmaps[terrainTierIndex]
            if (bitmap) {
              const chunkWorld = gridToWorld({
                x: chunkX * TERRAIN_CHUNK_SIZE,
                y: chunkY * TERRAIN_CHUNK_SIZE,
              })
              const chunkScreen = worldToScreen(chunkWorld, camera)
              const drawSize = TERRAIN_CHUNK_SIZE * cellSize
              ctx.imageSmoothingEnabled = false
              ctx.drawImage(bitmap, chunkScreen.x, chunkScreen.y, drawSize, drawSize)
              visibleTerrainTiles += cached?.terrainCount ?? chunk.length
              drawCallsEstimate += 1
              continue
            }
          }

          for (const cell of chunk) {
            if (!inView(cell.x, cell.y)) continue
            const world = gridToWorld({ x: cell.x, y: cell.y })
            const screen = worldToScreen(world, camera)
            const base = canvasPalette.terrain[cell.valley] ?? canvasPalette.terrain[1]
            const accessible = cell.valley <= Math.max(1, accessibleBridgeTier)
            const sprite = pickTerrainTilesetVariant(
              terrainTilesetRef.current,
              cell.x,
              cell.y,
              accessible ? cell.valley : 0,
            )
            if (sprite) {
              ctx.imageSmoothingEnabled = false
              ctx.drawImage(sprite, screen.x, screen.y, cellSize, cellSize)
              visibleTerrainTiles += 1
              drawCallsEstimate += 1
              continue
            }
            ctx.fillStyle = accessible ? base.fill : canvasPalette.terrainBlocked.fill
            ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
            visibleTerrainTiles += 1
            drawCallsEstimate += 1
            if (!lowDetail) {
              ctx.strokeStyle = accessible ? base.stroke : canvasPalette.terrainBlocked.stroke
              ctx.lineWidth = 1
              ctx.strokeRect(screen.x, screen.y, cellSize, cellSize)
              drawCallsEstimate += 1
            }
          }
        }
      }
      ctx.imageSmoothingEnabled = true

      if (!veryLowDetail) {
        const oreDepositCells = new Set(
          gameStateRef.current.oreDeposits.map((deposit) => toCellKey(deposit.x, deposit.y)),
        )
        const occupiedDecorationCells = new Set<string>()
        for (const key of occupiedStructureCellsRef.current.keys()) {
          occupiedDecorationCells.add(key)
        }
        for (const key of Object.keys(gameStateRef.current.bridges)) {
          occupiedDecorationCells.add(key)
        }
        for (const belt of gameStateRef.current.belts) {
          occupiedDecorationCells.add(toCellKey(belt.x, belt.y))
        }
        for (const miner of gameStateRef.current.miners) {
          occupiedDecorationCells.add(toCellKey(miner.x, miner.y))
        }
        for (const hub of gameStateRef.current.hubs) {
          occupiedDecorationCells.add(toCellKey(hub.x, hub.y))
        }
        for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {
          for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {
            const chunkKey = terrainChunkKey(chunkX, chunkY)
            const chunk = terrainChunksRef.current.get(chunkKey)
            if (!chunk) continue

            for (const cell of chunk) {
              if (!inView(cell.x, cell.y)) continue
              const cellKey = toCellKey(cell.x, cell.y)
              if (cell.valley > Math.max(1, accessibleBridgeTier)) continue
              if (oreDepositCells.has(cellKey)) continue
              if (occupiedDecorationCells.has(cellKey)) continue
              const decoration = pickValleyDecorationVariant(
                valleyDecorationsRef.current,
                cell.x,
                cell.y,
                cell.valley,
              )
              if (!decoration) continue

              const world = gridToWorld({ x: cell.x, y: cell.y })
              const screen = worldToScreen(world, camera)
              const drawWidthScale = decoration.type === 'tree' ? 0.94 : decoration.type === 'rock' ? 0.82 : 0.74
              const drawWidth = cellSize * drawWidthScale
              const drawHeight = decoration.type === 'tree' ? cellSize * 2 : cellSize * drawWidthScale
              const drawX = screen.x + (cellSize - drawWidth) * 0.5
              const drawY = screen.y + (cellSize - drawHeight)
              queuedDecorationDraws.push({
                bitmap: decoration.bitmap,
                drawX,
                drawY,
                drawWidth,
                drawHeight,
                depthY: drawY + drawHeight,
              })
            }
          }
        }
      }

      if (activePlacement && cellSize >= 8) {
        drawGrid(ctx, width, height, camera)
      }

      for (const [key, tier] of Object.entries(gameStateRef.current.bridges)) {
        const [x, y] = key.split(',').map(Number)
        if (!inView(x, y)) continue
        const buildId = BRIDGE_BUILD_BY_TIER[tier]
        if (!buildId) continue
        const color = BUILD_COLORS[buildId]
        const world = gridToWorld({ x, y })
        const screen = worldToScreen(world, camera)
        if (veryLowDetail) {
          ctx.fillStyle = color.fill
          ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
          drawCallsEstimate += 1
        } else {
          ctx.fillStyle = color.fill
          ctx.strokeStyle = color.stroke
          ctx.lineWidth = 2
          ctx.fillRect(screen.x + cellSize * 0.08, screen.y + cellSize * 0.08, cellSize * 0.84, cellSize * 0.84)
          drawCallsEstimate += 1
          if (!lowDetail) {
            ctx.strokeRect(
              screen.x + cellSize * 0.08,
              screen.y + cellSize * 0.08,
              cellSize * 0.84,
              cellSize * 0.84,
            )
            drawCallsEstimate += 1
          }
        }
        visibleBridges += 1
      }

      gameStateRef.current.oreDeposits.forEach((deposit) => {
        if (!inView(deposit.x, deposit.y)) return
        const valley = getTerrainValleyAt(gameStateRef.current, deposit.x, deposit.y) ?? 1
        const accessible = valley <= Math.max(1, accessibleBridgeTier)
        const ore = ORE_VISUALS[deposit.ore]
        const richness = Math.max(0, deposit.richness)
        const alpha = Math.max(0.18, Math.min(0.86, richness / 260))
        const world = gridToWorld({ x: deposit.x, y: deposit.y })
        const screen = worldToScreen(world, camera)
        ctx.globalAlpha = accessible ? alpha : 0.18
        const sprite = pickOreSpriteVariant(oreSpritesRef.current, deposit.ore, deposit.x, deposit.y)
        if (sprite) {
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(sprite, screen.x, screen.y, cellSize, cellSize)
          ctx.imageSmoothingEnabled = true
          drawCallsEstimate += 1
          ctx.globalAlpha = 1
          visibleDeposits += 1
          return
        }
        ctx.fillStyle = ore.fill
        ctx.strokeStyle = ore.stroke
        ctx.lineWidth = 1.5
        ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
        drawCallsEstimate += 1
        if (!lowDetail) {
          ctx.strokeRect(screen.x, screen.y, cellSize, cellSize)
          drawCallsEstimate += 1
        }
        ctx.globalAlpha = 1
        visibleDeposits += 1
      })

      if (queuedDecorationDraws.length > 0) {
        queuedDecorationDraws.sort((left, right) => left.depthY - right.depthY)
        ctx.imageSmoothingEnabled = false
        for (const decoration of queuedDecorationDraws) {
          ctx.drawImage(
            decoration.bitmap,
            decoration.drawX,
            decoration.drawY,
            decoration.drawWidth,
            decoration.drawHeight,
          )
          drawCallsEstimate += 1
        }
        ctx.imageSmoothingEnabled = true
      }

      gameStateRef.current.hubs.forEach((hub) => {
        const anchorKey = occupiedStructureCellsRef.current.get(toCellKey(hub.x, hub.y))
        if (anchorKey) {
          const occupyingStructure = placedStructuresRef.current.get(anchorKey)
          if (occupyingStructure?.buildId === 'logistics_hub') return
        }
        if (!inView(hub.x, hub.y)) return
        const world = gridToWorld({ x: hub.x, y: hub.y })
        const screen = worldToScreen(world, camera)
        const hubSprite = pickHubSprite(buildingSpritesRef.current)
        if (hubSprite) {
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(hubSprite, screen.x, screen.y, cellSize, cellSize)
          ctx.imageSmoothingEnabled = true
          drawCallsEstimate += 1
          return
        }
        const pulse = 0.44 + 0.05 * Math.sin(visualTimeSec * 3)
        const centerX = screen.x + cellSize / 2
        const centerY = screen.y + cellSize / 2
        ctx.fillStyle = '#ffe08c'
        ctx.strokeStyle = '#be8c2f'
        ctx.lineWidth = 2
        ctx.fillRect(screen.x + cellSize * 0.04, screen.y + cellSize * 0.04, cellSize * 0.92, cellSize * 0.92)
        drawCallsEstimate += 1
        if (!veryLowDetail) {
          ctx.strokeRect(screen.x + cellSize * 0.04, screen.y + cellSize * 0.04, cellSize * 0.92, cellSize * 0.92)
          drawCallsEstimate += 1
        }
        if (!lowDetail) {
          ctx.strokeStyle = `rgba(${canvasPalette.hubPulseRgb}, 0.66)`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(centerX, centerY, cellSize * pulse, 0, Math.PI * 2)
          ctx.stroke()
          drawCallsEstimate += 1
        }
      })

      const beltRender = renderBeltsLayer({
        ctx,
        state: gameStateRef.current,
        camera,
        cellSize,
        lowDetail,
        veryLowDetail,
        visualTimeSec,
        pausedBeltIds,
        buildingSprites: buildingSpritesRef.current,
        inView,
        beltFlowRgb: canvasPalette.beltFlowRgb,
        beltFlowVisualCellsPerSecond: BELT_FLOW_VISUAL_CELLS_PER_SECOND,
        detailedBeltEffects,
        maxDetailedBelts: MAX_DETAILED_BELTS,
      })
      drawCallsEstimate += beltRender.drawCallsEstimateDelta
      visibleBelts += beltRender.visibleBeltsDelta
      detailedBeltEffects = beltRender.detailedBeltEffects

      const minerRender = renderMinersLayer({
        ctx,
        state: gameStateRef.current,
        camera,
        cellSize,
        lowDetail,
        veryLowDetail,
        visualTimeSec,
        oreRichnessByCell,
        beltByCell,
        pausedBeltIds,
        buildingSprites: buildingSpritesRef.current,
        inView,
        minerRotorRgb: canvasPalette.minerRotorRgb,
        detailedMinerEffects,
        maxDetailedMiners: MAX_DETAILED_MINERS,
        minerSpriteDirectionOffset: MINER_SPRITE_DIRECTION_OFFSET,
        minerActivePulseAmplitude: MINER_ACTIVE_PULSE_AMPLITUDE,
        minerActivePulseSpeed: MINER_ACTIVE_PULSE_SPEED,
      })
      drawCallsEstimate += minerRender.drawCallsEstimateDelta
      visibleMiners += minerRender.visibleMinersDelta
      detailedMinerEffects = minerRender.detailedMinerEffects

      if (!hideItems) {
        const itemStride = lowDetail ? 2 : 1
        let drawItemIndex = 0
        gameStateRef.current.items.forEach((item) => {
          const belt = beltById.get(item.beltId)
          if (!belt) return
          if (!inView(belt.x, belt.y)) return
          visibleItems += 1
          if (drawItemIndex % itemStride !== 0) {
            drawItemIndex += 1
            return
          }
          drawItemIndex += 1
          const oreColor = ORE_ITEM_COLORS[item.resource as OreType]
          const worldX = (belt.x + 0.5 + item.progress * DX[belt.dir]) * BASE_CELL_SIZE
          const worldY = (belt.y + 0.5 + item.progress * DY[belt.dir]) * BASE_CELL_SIZE
          const screen = worldToScreen({ x: worldX, y: worldY }, camera)
          const size = cellSize * 0.34 * (0.9 + 0.2 * Math.sin(visualTimeSec * 8 + item.progress * 8))
          if (oreColor) {
            ctx.fillStyle = oreColor.fill
            ctx.strokeStyle = oreColor.stroke
            ctx.beginPath()
            ctx.arc(screen.x, screen.y, size / 2, 0, Math.PI * 2)
            ctx.fill()
            if (!lowDetail) {
              ctx.stroke()
              drawCallsEstimate += 2
            } else {
              drawCallsEstimate += 1
            }
          } else {
            const token = resourceLabel(item.resource).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '--'
            const x = screen.x - size / 2
            const y = screen.y - size / 2
            ctx.fillStyle = canvasPalette.machineTokenBg
            ctx.strokeStyle = '#7fa5a0'
            ctx.fillRect(x, y, size, size)
            drawCallsEstimate += 1
            if (!lowDetail) {
              ctx.strokeRect(x, y, size, size)
              ctx.fillStyle = '#e9f6ed'
              ctx.font = `${Math.max(7, cellSize * 0.14)}px sans-serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(token, screen.x, screen.y)
              drawCallsEstimate += 2
            }
          }
        })
      }

      const structureRender = renderStructuresLayer({
        ctx,
        camera,
        cellSize,
        lowDetail,
        veryLowDetail,
        visualTimeSec,
        inViewRect,
        structures: placedStructuresRef.current,
        processingMachines: processingMachinesRef.current,
        buildingSprites: buildingSpritesRef.current,
        canvasPalette,
        detailedProcessingStructureEffects,
        maxDetailedProcessingStructures: MAX_DETAILED_PROCESSING_STRUCTURES,
        producerPulseAmplitude: PROCESSING_ACTIVE_PULSE_AMPLITUDE,
        producerPulseSpeed: PROCESSING_ACTIVE_PULSE_SPEED,
        isProducerActive: (_structure, _key, machine) =>
          machine !== undefined && machine.status === 'crafting',
      })
      drawCallsEstimate += structureRender.drawCallsEstimateDelta
      visibleStructures += structureRender.visibleStructuresDelta
      detailedProcessingStructureEffects = structureRender.detailedProcessingStructureEffects

      const powerProviders: PowerProviderVisual[] = []
      const powerConsumers: PowerConsumerVisual[] = []
      for (const [id, structure] of placedStructuresRef.current.entries()) {
        if (structure.buildId === 'relay_tower' || structure.buildId === 'logistics_hub') {
          powerProviders.push({
            id,
            buildId: structure.buildId,
            anchor: structure.anchor,
            footprint: structure.footprint,
            center: structureCenter(structure.anchor, structure.footprint),
          })
          continue
        }
        if (!isProcessingBuildId(structure.buildId)) continue
        const cells: Point[] = []
        for (let fx = 0; fx < structure.footprint.width; fx += 1) {
          for (let fy = 0; fy < structure.footprint.height; fy += 1) {
            cells.push({ x: structure.anchor.x + fx, y: structure.anchor.y + fy })
          }
        }
        powerConsumers.push({
          id,
          center: structureCenter(structure.anchor, structure.footprint),
          cells,
        })
      }
      for (const miner of state.miners) {
        powerConsumers.push({
          id: miner.id,
          center: { x: miner.x + 0.5, y: miner.y + 0.5 },
          cells: [{ x: miner.x, y: miner.y }],
        })
      }
      if (powerProviders.length > 0) {
        const network = buildEnergizedPowerNetwork(powerProviders)
        const energizedProviders = network.energizedProviders
        const providerById = new Map(powerProviders.map((provider) => [provider.id, provider]))
        ctx.save()
        ctx.strokeStyle = 'rgba(235, 247, 255, 0.45)'
        ctx.lineWidth = Math.max(1.1, cellSize * 0.05)
        for (const link of network.links) {
          const fromProvider = providerById.get(link.fromId)
          const toProvider = providerById.get(link.toId)
          if (!fromProvider || !toProvider) continue
          const start = worldToScreen(
            { x: fromProvider.center.x * BASE_CELL_SIZE, y: fromProvider.center.y * BASE_CELL_SIZE },
            camera,
          )
          const end = worldToScreen(
            { x: toProvider.center.x * BASE_CELL_SIZE, y: toProvider.center.y * BASE_CELL_SIZE },
            camera,
          )
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.stroke()
          drawCallsEstimate += 1
        }
        if (energizedProviders.length > 0 && powerConsumers.length > 0) {
          for (const consumer of powerConsumers) {
            const provider = nearestPowerProviderForConsumer(consumer, energizedProviders)
            if (!provider) continue
            const start = worldToScreen(
              { x: provider.center.x * BASE_CELL_SIZE, y: provider.center.y * BASE_CELL_SIZE },
              camera,
            )
            const end = worldToScreen(
              { x: consumer.center.x * BASE_CELL_SIZE, y: consumer.center.y * BASE_CELL_SIZE },
              camera,
            )
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()
            drawCallsEstimate += 1
          }
        }
        ctx.restore()
      }

      const nowPresenceMs = Date.now()
      const presenceSettings = overlaySettingsRef.current
      if (presenceSettings.showPeerCursors || presenceSettings.showPeerPlacementHints) {
        const presenceScale = clamp(Number(presenceSettings.presenceScale) || 1, 0.6, 1.6)
        const remotePresenceValues = Object.values(remotePresencesRef.current)
        for (const presence of remotePresenceValues) {
          if (!presence) continue
          if (nowPresenceMs - presence.updatedAtMs > 10_000) continue
          const color = presenceColorForUser(presence.userId)
          const showPlacementHint = Boolean(presenceSettings.showPeerPlacementHints && presence.placementCell)
          let renderedPlacementHint = false

          if (showPlacementHint && presence.placementCell) {
            const buildId = resolveKnownBuildId(presence.placementBuildId)
            if (buildId) {
              renderedPlacementHint = true
              const direction = presence.placementDirection ?? 'right'
              const footprint = getStructureFootprint(buildId, direction)
              const placementWorld = gridToWorld(presence.placementCell)
              const placementScreen = worldToScreen(placementWorld, camera)
              const drawWidth = cellSize * footprint.width
              const drawHeight = cellSize * footprint.height

              ctx.save()
              ctx.globalAlpha = 0.88
              ctx.fillStyle = color.fill
              ctx.strokeStyle = color.stroke
              ctx.lineWidth = Math.max(1.2, cellSize * 0.08)
              ctx.setLineDash([Math.max(2, cellSize * 0.18), Math.max(2, cellSize * 0.16)])
              ctx.fillRect(placementScreen.x, placementScreen.y, drawWidth, drawHeight)
              ctx.strokeRect(placementScreen.x, placementScreen.y, drawWidth, drawHeight)
              ctx.setLineDash([])
              if (isBuildDirectional(buildId) || isProcessingBuildId(buildId)) {
                ctx.fillStyle = color.stroke
                drawDirectionArrow(
                  ctx,
                  placementScreen.x + drawWidth * 0.5,
                  placementScreen.y + drawHeight * 0.5,
                  direction,
                  Math.min(drawWidth, drawHeight) * 0.22,
                )
              }
              if (presenceSettings.showPeerNames) {
                const labelSize = Math.max(10, cellSize * 0.24 * presenceScale)
                ctx.font = `600 ${labelSize}px "Techno Codex", sans-serif`
                ctx.textAlign = 'left'
                ctx.textBaseline = 'bottom'
                ctx.fillStyle = '#101010'
                ctx.fillText(presence.username, placementScreen.x + 2, placementScreen.y - 3)
              }
              ctx.restore()
              drawCallsEstimate += 4
            }
          }

          if (presenceSettings.showPeerCursors && presence.cursorCell && !renderedPlacementHint) {
            const cursorWorld = gridToWorld(presence.cursorCell)
            const cursorScreen = worldToScreen(cursorWorld, camera)
            const centerX = cursorScreen.x + cellSize * 0.5
            const centerY = cursorScreen.y + cellSize * 0.5
            const crossRadius = Math.max(4, cellSize * 0.26 * presenceScale)
            const labelSize = Math.max(10, cellSize * 0.24 * presenceScale)
            ctx.save()
            ctx.strokeStyle = color.stroke
            ctx.fillStyle = color.fill
            ctx.lineWidth = Math.max(1.2, cellSize * 0.08)
            ctx.beginPath()
            ctx.arc(centerX, centerY, crossRadius, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(centerX - crossRadius - 3, centerY)
            ctx.lineTo(centerX + crossRadius + 3, centerY)
            ctx.moveTo(centerX, centerY - crossRadius - 3)
            ctx.lineTo(centerX, centerY + crossRadius + 3)
            ctx.stroke()
            if (presenceSettings.showPeerNames) {
              ctx.font = `600 ${labelSize}px "Techno Codex", sans-serif`
              ctx.textAlign = 'left'
              ctx.textBaseline = 'bottom'
              ctx.fillStyle = '#101010'
              ctx.fillText(presence.username, centerX + crossRadius + 4, centerY - 2)
            }
            ctx.restore()
            drawCallsEstimate += 4
          }
        }
      }

      const hovered = hoveredCellRef.current
      if (hovered) {
        const hoveredAnchorKey = occupiedStructureCellsRef.current.get(toCellKey(hovered.x, hovered.y))
        if (hoveredAnchorKey) {
          const hoveredStructure = placedStructuresRef.current.get(hoveredAnchorKey)
          if (hoveredStructure && (hoveredStructure.buildId === 'relay_tower' || hoveredStructure.buildId === 'logistics_hub')) {
            const offsets = POWER_COVERAGE_OFFSETS[hoveredStructure.buildId]
            const rangeMinX = hoveredStructure.anchor.x + offsets.min
            const rangeMinY = hoveredStructure.anchor.y + offsets.min
            const rangeWidth = hoveredStructure.footprint.width + (offsets.max - offsets.min)
            const rangeHeight = hoveredStructure.footprint.height + (offsets.max - offsets.min)
            const rangeScreen = worldToScreen(
              { x: rangeMinX * BASE_CELL_SIZE, y: rangeMinY * BASE_CELL_SIZE },
              camera,
            )
            ctx.save()
            ctx.fillStyle = 'rgba(186, 221, 255, 0.14)'
            ctx.strokeStyle = 'rgba(220, 242, 255, 0.68)'
            ctx.lineWidth = Math.max(1.1, cellSize * 0.06)
            ctx.setLineDash([Math.max(3, cellSize * 0.2), Math.max(3, cellSize * 0.16)])
            ctx.fillRect(rangeScreen.x, rangeScreen.y, rangeWidth * cellSize, rangeHeight * cellSize)
            ctx.strokeRect(rangeScreen.x, rangeScreen.y, rangeWidth * cellSize, rangeHeight * cellSize)
            ctx.restore()
            drawCallsEstimate += 2
          }
        }
      }
      if (hovered && !isCameraNavigating) {
        const hoverScreen = worldToScreen(gridToWorld(hovered), camera)
        ctx.strokeStyle = `rgba(${canvasPalette.hoverOutlineRgb}, 0.42)`
        ctx.lineWidth = 1.5
        ctx.strokeRect(hoverScreen.x + 1, hoverScreen.y + 1, cellSize - 2, cellSize - 2)
      }
      emitHoverInspector(
        buildHoverInspectorSnapshot({
          state,
          hovered,
          isCameraNavigating,
          beltItemCounts,
          occupiedStructureCells: occupiedStructureCellsRef.current,
          placedStructures: placedStructuresRef.current,
          processingMachines: processingMachinesRef.current,
          accessibleBridgeTier,
          buildLabel,
          machineStatusLabel,
        }),
      )

      if (activePlacement) {
        const buildId = currentPlacement.selectedBuildId
        const placementTierContext = {
          accessibleTier: accessibleBridgeTier,
          placeableTier: Math.min(Math.max(1, unlockedBridgeTier), Math.max(1, accessibleBridgeTier) + 1),
        }
        const placementContext = {
          state: gameStateRef.current,
          placedStructures: placedStructuresRef.current,
          occupiedStructureCells: occupiedStructureCellsRef.current,
          refundableBuilds: refundableBuildsRef.current,
          reachable: resolveCurrentReachableSet(placementTierContext.accessibleTier),
          bridgeTierContext: placementTierContext,
        }
        let nextRelayPlacementStatus: RelayPlacementStatus | null = null
        let relayPreviewAnchor: Point | null = null
        let relayPreviewDirection: Direction | null = null
        const dragPreview = placementDragRef.current.active ? placementDragRef.current.previewSteps : []
        if (dragPreview.length > 0) {
          const bridgePreviewValidity =
            isBridgeBuildId(buildId)
              ? evaluateBridgeDragPreview(state, buildId, dragPreview, unlockedBridgeTier, accessibleBridgeTier)
              : null
          for (const step of dragPreview) {
            const valid = bridgePreviewValidity
              ? (bridgePreviewValidity.get(toCellKey(step.cell.x, step.cell.y)) ?? false)
              : canPlaceBuildAt(placementContext, step.cell, buildId, step.direction)
            drawPlacementPreview(ctx, step.cell, buildId, step.direction, camera, valid)
          }
          if (buildId === 'relay_tower') {
            const lastStep = dragPreview[dragPreview.length - 1]
            relayPreviewAnchor = lastStep.cell
            relayPreviewDirection = lastStep.direction
          }
        } else if (hovered) {
          const valid = canPlaceBuildAt(
            placementContext,
            hovered,
            buildId,
            placementDirectionRef.current,
          )
          if (buildId === 'relay_tower') {
            relayPreviewAnchor = hovered
            relayPreviewDirection = placementDirectionRef.current
            const nearest = nearestPowerProviderForRelayPlacement(
              hovered,
              placementDirectionRef.current,
              powerProviders,
            )
            if (valid) {
              nextRelayPlacementStatus = {
                tone: 'good',
                message:
                  nearest.provider && Number.isFinite(nearest.distanceTiles)
                    ? `relay in range (${nearest.distanceTiles.toFixed(2)} / ${RELAY_MAX_LINK_DISTANCE_TILES.toFixed(2)} tiles)`
                    : 'relay placement valid',
              }
            } else {
              const reason = getPlacementFailureReason(
                placementContext,
                hovered,
                buildId,
                placementDirectionRef.current,
              )
              if (reason.includes('within 10 tiles') || reason.includes('too far')) {
                nextRelayPlacementStatus = {
                  tone: 'bad',
                  message:
                    nearest.provider && Number.isFinite(nearest.distanceTiles)
                      ? `too far (${nearest.distanceTiles.toFixed(2)} / ${RELAY_MAX_LINK_DISTANCE_TILES.toFixed(2)} tiles)`
                      : reason,
                }
              }
            }
          }
          drawPlacementPreview(ctx, hovered, buildId, placementDirectionRef.current, camera, valid)
        }
        if (buildId === 'relay_tower' && relayPreviewAnchor && relayPreviewDirection) {
          const nearest = nearestPowerProviderForRelayPlacement(relayPreviewAnchor, relayPreviewDirection, powerProviders)
          if (nearest.provider && Number.isFinite(nearest.distanceTiles)) {
            const relayCenter = structureCenter(
              relayPreviewAnchor,
              getStructureFootprint('relay_tower', relayPreviewDirection),
            )
            const start = worldToScreen(
              { x: relayCenter.x * BASE_CELL_SIZE, y: relayCenter.y * BASE_CELL_SIZE },
              camera,
            )
            const end = worldToScreen(
              { x: nearest.provider.center.x * BASE_CELL_SIZE, y: nearest.provider.center.y * BASE_CELL_SIZE },
              camera,
            )
            const inRange = nearest.distanceTiles <= RELAY_MAX_LINK_DISTANCE_TILES + 1e-9
            const midX = (start.x + end.x) * 0.5
            const midY = (start.y + end.y) * 0.5
            ctx.save()
            ctx.strokeStyle = inRange ? 'rgba(122, 231, 146, 0.92)' : 'rgba(233, 108, 108, 0.92)'
            ctx.lineWidth = Math.max(1.5, cellSize * 0.08)
            ctx.setLineDash([Math.max(4, cellSize * 0.26), Math.max(3, cellSize * 0.18)])
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()
            ctx.setLineDash([])
            const distanceLabel = `${nearest.distanceTiles.toFixed(2)} tiles`
            ctx.font = `600 ${Math.max(10, cellSize * 0.2)}px "Techno Codex", sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillStyle = inRange ? '#d8ffde' : '#ffdede'
            ctx.fillText(distanceLabel, midX, midY - 4)
            ctx.restore()
            drawCallsEstimate += 2
          }
        }
        setRelayPlacementStatusSnapshot(nextRelayPlacementStatus)
      } else {
        setRelayPlacementStatusSnapshot(null)
      }

      const frameEndMs = typeof performance !== 'undefined' ? performance.now() : time
      const frameMs = Math.max(1, frameEndMs - frameStartMs)
      const updateMs = Math.max(0, updateEndMs - frameStartMs)
      const drawMs = Math.max(0, frameEndMs - updateEndMs)
      const fps = 1000 / frameDeltaMs
      const perf = framePerfRef.current
      const alpha = 0.18
      perf.fps = perf.fps <= 0 ? fps : perf.fps + (fps - perf.fps) * alpha
      perf.frameMs = perf.frameMs + (frameMs - perf.frameMs) * alpha
      perf.updateMs = perf.updateMs + (updateMs - perf.updateMs) * alpha
      perf.drawMs = perf.drawMs + (drawMs - perf.drawMs) * alpha
      perf.terrainTilesVisible = visibleTerrainTiles
      perf.bridgesVisible = visibleBridges
      perf.depositsVisible = visibleDeposits
      perf.beltsVisible = visibleBelts
      perf.minersVisible = visibleMiners
      perf.itemsVisible = visibleItems
      perf.structuresVisible = visibleStructures
      perf.drawCallsEstimate = drawCallsEstimate
      perf.terrainRasterReady = terrainRasterReadyRef.current
      perf.terrainRasterChunks = terrainRasterCacheRef.current.size
      perf.cameraOptimizationActive = isCameraNavigating

      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    rafRef.current = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div ref={shellRef} className="game-canvas-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onMouseDown={(event) => {
          const cell = readCellFromPointer(event.clientX, event.clientY)
          hoveredCellRef.current = cell
          emitLocalPresence(cell)

          if (event.button === 2) {
            if (placementDragRef.current.active) {
              clearPlacementDrag()
              emitLocalPresence(hoveredCellRef.current)
              return
            }
            if (event.altKey && cell) {
              removeAtCell(cell)
              emitLocalPresence(cell)
              return
            }
            panDragRef.current.active = true
            panDragRef.current.lastPointer = { x: event.clientX, y: event.clientY }
            emitLocalPresence(cell)
            return
          }

          if (event.button !== 0 || !cell) return
          if (!canPlace(placementIntentRef.current)) return

          const drag = placementDragRef.current
          drag.active = true
          drag.anchorCell = cell
          drag.previewSteps = buildPlacementPath(cell, cell, event.shiftKey, placementDirectionRef.current)
          emitLocalPresence(cell)
        }}
        onMouseMove={(event) => {
          const cell = readCellFromPointer(event.clientX, event.clientY)
          hoveredCellRef.current = cell
          emitLocalPresence(cell)

          if (panDragRef.current.active) {
            const last = panDragRef.current.lastPointer
            const dx = event.clientX - last.x
            const dy = event.clientY - last.y
            panDragRef.current.lastPointer = { x: event.clientX, y: event.clientY }
            offsetRef.current = {
              x: offsetRef.current.x + dx,
              y: offsetRef.current.y + dy,
            }
            return
          }

          if (!cell || !placementDragRef.current.active) return
          updatePlacementPreview(cell, event.shiftKey)
        }}
        onMouseUp={(event) => {
          if (event.button === 0) {
            const cell = readCellFromPointer(event.clientX, event.clientY)
            hoveredCellRef.current = cell
            emitLocalPresence(cell)
            if (canPlace(placementIntentRef.current)) {
              const result = commitPlacementPreview()
              if (!result.changed && result.reason) {
                showPlacementFeedback(result.reason)
              }
              clearPlacementDrag()
            } else {
              clearPlacementDrag()
              selectMachineAtCell(cell)
            }
          }
          if (event.button === 2) {
            panDragRef.current.active = false
          }
        }}
        onMouseLeave={() => {
          if (!panDragRef.current.active && !placementDragRef.current.active) {
            hoveredCellRef.current = null
            emitLocalPresence(null)
            return
          }
          hoveredCellRef.current = null
          emitLocalPresence(null)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
        }}
      />
      <CanvasHoverOverlay store={hoverInspectorStore} />
      {placementFeedback ? <div className="canvas-placement-feedback">{placementFeedback}</div> : null}
      {relayPlacementStatus ? (
        <div className={`canvas-placement-status canvas-placement-status-${relayPlacementStatus.tone}`}>
          {relayPlacementStatus.message}
        </div>
      ) : null}
      <ProductionConfigModal
        open={selectedMachineView !== null}
        selectedConfig={selectedMachineView}
        onClose={clearSelectedMachine}
        onSelectOption={setSelectedMachineOption}
        resourceLabel={resourceLabel}
      />
    </div>
  )
}

const MemoizedGameCanvas = memo(GameCanvas)
MemoizedGameCanvas.displayName = 'GameCanvas'

export default MemoizedGameCanvas
