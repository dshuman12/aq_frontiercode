import type { Direction, GameState, ProcessingMachineState } from '../../../game/engine'
import type { BuildId } from '../buildCatalog'

export type MultiplayerPlacedStructure = {
  anchor: { x: number; y: number }
  anchorKey: string
  buildId: BuildId
  direction: Direction
  footprint: { width: number; height: number }
  occupiedKeys: string[]
}

export type MultiplayerDynamicGameState = Pick<
  GameState,
  | 'belts'
  | 'items'
  | 'miners'
  | 'hubs'
  | 'inventory'
  | 'materials'
  | 'unlocked'
  | 'storageBuildings'
  | 'bridges'
  | 'nextId'
>

export type MultiplayerStaticWorldState = Pick<GameState, 'terrain' | 'bridgeSlots' | 'oreDeposits' | 'valleySeed'>

export type MultiplayerStateSnapshot = {
  version: 1
  updatedAtMs: number
  dynamicState: MultiplayerDynamicGameState
  staticWorld?: MultiplayerStaticWorldState
  placedStructures: MultiplayerPlacedStructure[]
  refundableBuilds: Array<{ cellKey: string; buildId: BuildId }>
  processingMachines: Array<{ id: string; machine: ProcessingMachineState }>
}

export type GridCell = { x: number; y: number }

export type LocalPlayerPresenceUpdate = {
  cursorCell: GridCell | null
  placementCell: GridCell | null
  placementBuildId: BuildId | null
  placementDirection: Direction | null
}

export type RemotePlayerPresence = LocalPlayerPresenceUpdate & {
  userId: string
  username: string
  updatedAtMs: number
}

export type MultiplayerOverlaySettings = {
  showPeerCursors: boolean
  showPeerPlacementHints: boolean
  showPeerNames: boolean
  presenceScale: number
}

export const DEFAULT_MULTIPLAYER_OVERLAY_SETTINGS: MultiplayerOverlaySettings = {
  showPeerCursors: true,
  showPeerPlacementHints: true,
  showPeerNames: true,
  presenceScale: 1,
}

export type LockstepPlacementStep = {
  x: number
  y: number
  direction: Direction
}

export type LockstepCommandPayload =
  | {
      type: 'place_steps'
      buildId: BuildId
      steps: LockstepPlacementStep[]
    }
  | {
      type: 'remove_cell'
      cell: GridCell
    }
  | {
      type: 'set_machine_recipe'
      machineKey: string
      recipeId: string | null
    }

export type OutboundLockstepCommand = {
  tick: number
  command: LockstepCommandPayload
}

export type LockstepCommandEnvelope = {
  tick: number
  userId: string
  username: string
  command: LockstepCommandPayload
}

export type LockstepTickPacket = {
  tick: number
  commands: LockstepCommandEnvelope[]
}

export type LockstepBootstrap = {
  currentTick: number
  tickIntervalMs: number
}
