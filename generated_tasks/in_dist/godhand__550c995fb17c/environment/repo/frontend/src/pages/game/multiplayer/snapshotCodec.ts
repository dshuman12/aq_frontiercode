import type { GameState, ProcessingMachineState } from '../../../game/engine'
import type { BuildId } from '../buildCatalog'
import { toCellKey } from '../components/canvasMath'
import type { PlacedStructure } from '../components/canvasPlacement'
import { getStructureCells } from '../components/machineLayout'
import type {
  MultiplayerDynamicGameState,
  MultiplayerStateSnapshot,
  MultiplayerStaticWorldState,
} from './types'

export type MultiplayerSnapshotBuildInput = {
  gameState: GameState
  placedStructures: Map<string, PlacedStructure>
  refundableBuilds: Map<string, BuildId>
  processingMachines: Map<string, ProcessingMachineState>
}

export type MultiplayerSnapshotBuildOptions = {
  includeStaticWorld?: boolean
}

export type NormalizedMultiplayerSnapshot = {
  updatedAtMs: number
  gameState: GameState
  placedStructures: Map<string, PlacedStructure>
  occupiedStructureCells: Map<string, string>
  refundableBuilds: Map<string, BuildId>
  processingMachines: Map<string, ProcessingMachineState>
}

function normalizeBeltLike(raw: unknown): GameState['belts'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<GameState['belts'][number]>
  if (typeof value.id !== 'string' || typeof value.x !== 'number' || typeof value.y !== 'number') return null
  if (value.dir !== 'up' && value.dir !== 'right' && value.dir !== 'down' && value.dir !== 'left') return null
  const buildId = value.buildId === 'splitter' ? 'splitter' : 'conveyor'
  return {
    id: value.id,
    x: value.x,
    y: value.y,
    dir: value.dir,
    buildId,
    splitterNextOutputIndex:
      buildId === 'splitter' && typeof value.splitterNextOutputIndex === 'number'
        ? Math.max(0, Math.floor(value.splitterNextOutputIndex) % 3)
        : undefined,
  }
}

function cloneDynamicGameState(state: GameState): MultiplayerDynamicGameState {
  return {
    belts: state.belts.map((belt) => normalizeBeltLike(belt)).filter((belt): belt is GameState['belts'][number] => belt !== null),
    items: state.items.map((item) => ({ ...item })),
    miners: state.miners.map((miner) => ({ ...miner })),
    hubs: state.hubs.map((hub) => ({ ...hub })),
    inventory: { ...state.inventory },
    materials: { ...state.materials },
    unlocked: { ...state.unlocked },
    storageBuildings: state.storageBuildings,
    bridges: { ...state.bridges },
    nextId: state.nextId,
  }
}

function cloneStaticWorldState(state: GameState): MultiplayerStaticWorldState {
  return {
    terrain: { ...state.terrain },
    bridgeSlots: { ...state.bridgeSlots },
    oreDeposits: state.oreDeposits.map((deposit) => ({ ...deposit })),
    valleySeed: state.valleySeed,
  }
}

function clonePlacedStructure(structure: PlacedStructure): PlacedStructure {
  return {
    anchor: { ...structure.anchor },
    anchorKey: structure.anchorKey,
    buildId: structure.buildId,
    direction: structure.direction,
    footprint: {
      width: structure.footprint.width,
      height: structure.footprint.height,
    },
    occupiedKeys: [...structure.occupiedKeys],
  }
}

function cloneProcessingMachine(machine: ProcessingMachineState): ProcessingMachineState {
  return {
    ...machine,
    inputBuffer: { ...machine.inputBuffer },
  }
}

function buildGameStateFromSnapshot(
  dynamicState: MultiplayerDynamicGameState,
  baseState: GameState,
  staticWorld?: MultiplayerStaticWorldState,
): GameState {
  return {
    belts: dynamicState.belts
      .map((belt) => normalizeBeltLike(belt))
      .filter((belt): belt is GameState['belts'][number] => belt !== null),
    items: dynamicState.items.map((item) => ({ ...item })),
    oreDeposits: staticWorld
      ? staticWorld.oreDeposits.map((deposit) => ({ ...deposit }))
      : baseState.oreDeposits.map((deposit) => ({ ...deposit })),
    miners: dynamicState.miners.map((miner) => ({ ...miner })),
    hubs: dynamicState.hubs.map((hub) => ({ ...hub })),
    inventory: { ...dynamicState.inventory },
    materials: { ...dynamicState.materials },
    unlocked: { ...dynamicState.unlocked },
    storageBuildings: dynamicState.storageBuildings,
    terrain: staticWorld ? { ...staticWorld.terrain } : { ...baseState.terrain },
    bridgeSlots: staticWorld ? { ...staticWorld.bridgeSlots } : { ...baseState.bridgeSlots },
    bridges: { ...dynamicState.bridges },
    valleySeed: staticWorld ? staticWorld.valleySeed : baseState.valleySeed,
    nextId: dynamicState.nextId,
  }
}

export function buildMultiplayerSnapshot(
  input: MultiplayerSnapshotBuildInput,
  options: MultiplayerSnapshotBuildOptions = {},
): MultiplayerStateSnapshot {
  const snapshot: MultiplayerStateSnapshot = {
    version: 1,
    updatedAtMs: Date.now(),
    dynamicState: cloneDynamicGameState(input.gameState),
    placedStructures: Array.from(input.placedStructures.values()).map((structure) =>
      clonePlacedStructure(structure),
    ),
    refundableBuilds: Array.from(input.refundableBuilds.entries()).map(([cellKey, buildId]) => ({
      cellKey,
      buildId,
    })),
    processingMachines: Array.from(input.processingMachines.entries()).map(([id, machine]) => ({
      id,
      machine: cloneProcessingMachine(machine),
    })),
  }

  if (options.includeStaticWorld) {
    snapshot.staticWorld = cloneStaticWorldState(input.gameState)
  }
  return snapshot
}

export function normalizeMultiplayerSnapshot(
  snapshot: MultiplayerStateSnapshot,
  baseState: GameState,
): NormalizedMultiplayerSnapshot | null {
  if (!snapshot || snapshot.version !== 1 || !snapshot.dynamicState) return null
  if (!baseState) return null

  const dynamicState = snapshot.dynamicState
  const staticWorld = snapshot.staticWorld
  const gameState = buildGameStateFromSnapshot(dynamicState, baseState, staticWorld)
  const placedStructures = new Map<string, PlacedStructure>()
  const occupiedStructureCells = new Map<string, string>()
  const refundableBuilds = new Map<string, BuildId>()
  const processingMachines = new Map<string, ProcessingMachineState>()

  const structures = Array.isArray(snapshot.placedStructures) ? snapshot.placedStructures : []
  for (const structure of structures) {
    if (!structure?.anchor || typeof structure.anchor.x !== 'number' || typeof structure.anchor.y !== 'number') {
      continue
    }
    const anchorKey = toCellKey(structure.anchor.x, structure.anchor.y)
    const cloned = clonePlacedStructure(structure)
    cloned.anchorKey = anchorKey
    cloned.occupiedKeys = Array.isArray(structure.occupiedKeys)
      ? [...structure.occupiedKeys]
      : getStructureCells(cloned.anchor, cloned.buildId, cloned.direction).map((cell) => toCellKey(cell.x, cell.y))

    placedStructures.set(anchorKey, cloned)
    for (const occupiedKey of cloned.occupiedKeys) {
      occupiedStructureCells.set(occupiedKey, anchorKey)
    }
  }

  const refundableEntries = Array.isArray(snapshot.refundableBuilds) ? snapshot.refundableBuilds : []
  for (const entry of refundableEntries) {
    if (!entry || typeof entry.cellKey !== 'string') continue
    refundableBuilds.set(entry.cellKey, entry.buildId)
  }

  const machineEntries = Array.isArray(snapshot.processingMachines) ? snapshot.processingMachines : []
  for (const entry of machineEntries) {
    if (!entry || typeof entry.id !== 'string' || !entry.machine) continue
    processingMachines.set(entry.id, cloneProcessingMachine(entry.machine))
  }

  return {
    updatedAtMs: Number(snapshot.updatedAtMs || 0),
    gameState,
    placedStructures,
    occupiedStructureCells,
    refundableBuilds,
    processingMachines,
  }
}
