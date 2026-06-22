import type { Direction, GridPos, Inventory, OreType, TerrainMap } from '../types'

// these 
export type SeededDeposit = {
  x: number
  y: number
  ore: OreType
  richness: number
}

export type SeededBelt = {
  x: number
  y: number
  dir: Direction
}

export type SeededMiner = {
  x: number
  y: number
  dir: Direction
  kind: 'miner' | 'drill'
}

export type SeededWorld = {
  terrain: TerrainMap
  bridgeSlots: Record<string, number>
  deposits: SeededDeposit[]
  hub: GridPos
  starterBelts: SeededBelt[]
  starterMiners: SeededMiner[]
  starterInventory: Partial<Inventory>
}

export type GeneratedIsland = {
  id: number
  valley: number
  center: GridPos
  radius: number
  kind: 'major' | 'satellite'
}

export type IslandPlacementResult = {
  majorIslands: GeneratedIsland[]
  satelliteIslands: GeneratedIsland[]
  allIslands: GeneratedIsland[]
}
