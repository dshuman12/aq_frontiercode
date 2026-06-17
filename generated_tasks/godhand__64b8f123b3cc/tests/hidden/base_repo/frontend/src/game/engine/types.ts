export type GridPos = { x: number; y: number }

export type Direction = 'up' | 'right' | 'down' | 'left'

export const ORE_TYPES = [
  'iron',
  'copper',
  'coal',
  'silica',
  'aluminum',
  'titanium',
  'lithium',
  'tungsten',
  'thorium',
] as const

export type OreType = (typeof ORE_TYPES)[number]

export type MaterialType = string

export const BUILDABLE_IDS = [
  'conveyor',
  'splitter',
  'storage',
  'depot_in',
  'depot_out',
  'miner',
  'drill',
  'smelter',
  'assembler',
  'refinery',
  'lab',
  'generator',
  'relay_tower',
  'logistics_hub',
  'bridge_t1',
  'bridge_t2',
  'bridge_t3',
  'bridge_t4',
] as const

export type BuildableId = (typeof BUILDABLE_IDS)[number]

export type ResourceType = OreType | MaterialType

export type CraftRecipeId = string

export type CraftingStationId = BuildableId | 'manual'

export type Inventory = Record<OreType, number>

export type MaterialInventory = Record<MaterialType, number>

export type UnlockState = Record<BuildableId, boolean>

export type ResourceCost = Partial<Record<ResourceType, number>>

export type TerrainMap = Record<string, number>

export type BridgeSlotMap = Record<string, number>

export type BridgeTileMap = Record<string, number>

export type Belt = {
  id: string
  x: number
  y: number
  dir: Direction
  buildId: 'conveyor' | 'splitter'
  splitterNextOutputIndex?: number
}

export type Item = {
  id: string
  resource: ResourceType
  beltId: string
  progress: number
}

export type OreDeposit = {
  id: string
  x: number
  y: number
  ore: OreType
  richness: number
}

export type Miner = {
  id: string
  x: number
  y: number
  ore: OreType
  kind: 'miner' | 'drill'
  outputDir: Direction
  cycleSec: number
  cooldownSec: number
}

export type Hub = {
  id: string
  x: number
  y: number
}

export type GameState = {
  belts: Belt[]
  items: Item[]
  oreDeposits: OreDeposit[]
  miners: Miner[]
  hubs: Hub[]
  inventory: Inventory
  materials: MaterialInventory
  unlocked: UnlockState
  storageBuildings: number
  terrain: TerrainMap
  bridgeSlots: BridgeSlotMap
  bridges: BridgeTileMap
  valleySeed: number
  nextId: number
}

export type StorageSnapshot = {
  orePerResource: number
  materialPerResource: number
  storageBuildings: number
}

export type EconomySnapshot = {
  inventory: Inventory
  materials: MaterialInventory
  unlocked: UnlockState
  storage: StorageSnapshot
}
