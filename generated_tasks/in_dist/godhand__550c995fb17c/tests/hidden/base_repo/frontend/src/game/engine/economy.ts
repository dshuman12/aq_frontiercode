import {
  BUILDABLE_IDS,
  ORE_TYPES,
  type BuildableId,
  type CraftRecipeId,
  type EconomySnapshot,
  type GameState,
  type MaterialInventory,
  type ResourceCost,
  type ResourceType,
  type StorageSnapshot,
  type UnlockState,
} from './types'
import {
  CRAFT_RECIPES,
  MATERIAL_TYPES,
  isCraftingStationAvailable,
} from './craftingCatalog'
import {
  getBridgeTierForBuild,
  isBridgeBuildId,
  isBuildDefaultUnlocked,
} from './buildingCatalog'

export {
  CRAFT_RECIPES,
  CRAFTING_STATIONS,
  MATERIAL_LABELS,
  MATERIAL_TYPES,
  getCraftingStationLabel,
  isCraftingStationAvailable,
  type CraftRecipeDefinition,
  type CraftingStationDefinition,
} from './craftingCatalog'

export const EMPTY_MATERIALS: MaterialInventory = MATERIAL_TYPES.reduce(
  (acc, material) => {
    acc[material] = 0
    return acc
  },
  {} as MaterialInventory,
)

export const STARTING_UNLOCKS: UnlockState = BUILDABLE_IDS.reduce(
  (acc, buildId) => {
    acc[buildId] = isBuildDefaultUnlocked(buildId)
    return acc
  },
  {} as UnlockState,
)

export const BUILD_COSTS: Record<BuildableId, ResourceCost> = {
  conveyor: { iron: 1 },
  splitter: { plate: 2, wire: 2 },
  storage: { plate: 8, wire: 4, iron: 6 },
  depot_in: { plate: 4, wire: 2, iron: 3 },
  depot_out: { plate: 4, wire: 2, iron: 3 },
  miner: { iron: 4, plate: 1 },
  drill: { steel: 2, gear: 2 },
  smelter: { plate: 5, coal: 6 },
  assembler: { wire: 6, steel: 3 },
  refinery: { titanium: 8, polymer: 6 },
  lab: { circuit: 8, alloy: 4 },
  generator: { gear: 6, coal: 10 },
  relay_tower: { steel: 4, wire: 10, circuit: 2 },
  logistics_hub: { alloy: 10, core: 2 },
  bridge_t1: { plate: 18, wire: 14, gear: 8, steel: 6 },
  bridge_t2: { plate: 18, wire: 14, gear: 8, steel: 6 },
  bridge_t3: { polymer: 18, circuit: 14, steel: 12, gear: 8 },
  bridge_t4: { alloy: 20, circuit: 16, polymer: 12, steel: 10 },
}


export const UNLOCK_RULES: Partial<
  Record<
    BuildableId,
    {
      buildId: BuildableId
      label: string
      cost: ResourceCost
      description: string
      valley: number
    }
  >
> = {
  splitter: {
    buildId: 'splitter',
    label: 'Unlock Splitter',
    cost: { plate: 4, wire: 4 },
    description: 'Split conveyor lines for compact layouts.',
    valley: 1,
  },
  smelter: {
    buildId: 'smelter',
    label: 'Unlock Smelter',
    cost: { plate: 8, coal: 12 },
    description: 'Enables heavy ore-to-material throughput.',
    valley: 1,
  },
  generator: {
    buildId: 'generator',
    label: 'Unlock Generator',
    cost: { gear: 8, coal: 20 },
    description: 'Stabilizes power for scaled production.',
    valley: 1,
  },
  drill: {
    buildId: 'drill',
    label: 'Unlock Drill',
    cost: { steel: 10, polymer: 8, gear: 8 },
    description: 'High speed extraction for upgraded nodes.',
    valley: 2,
  },
  assembler: {
    buildId: 'assembler',
    label: 'Unlock Assembler',
    cost: { steel: 8, polymer: 8, wire: 12 },
    description: 'Advanced component synthesis chain.',
    valley: 2,
  },
  refinery: {
    buildId: 'refinery',
    label: 'Unlock Refinery',
    cost: { alloy: 8, circuit: 8, titanium: 12 },
    description: 'Refines high-tier ore streams.',
    valley: 3,
  },
  lab: {
    buildId: 'lab',
    label: 'Unlock Lab',
    cost: { core: 2, alloy: 12, circuit: 12 },
    description: 'Research center for late-stage optimization.',
    valley: 4,
  },
  logistics_hub: {
    buildId: 'logistics_hub',
    label: 'Unlock Logistics Hub',
    cost: { core: 3, tungsten: 14, thorium: 10 },
    description: 'Final-tier throughput and routing node.',
    valley: 4,
  },
}

export const VALLEY_PROGRESSION = [
  {
    valley: 1,
    title: 'Valley 1: Hub Basin',
    ores: ['iron', 'copper', 'coal'] as const,
    buildings: [
      'conveyor',
      'miner',
      'splitter',
      'storage',
      'depot_in',
      'depot_out',
      'smelter',
      'generator',
      'relay_tower',
      'bridge_t2',
    ] as const,
  },
  {
    valley: 2,
    title: 'Valley 2: Silica Shelf',
    ores: ['silica', 'aluminum'] as const,
    buildings: ['bridge_t2', 'drill', 'assembler'] as const,
  },
  {
    valley: 3,
    title: 'Valley 3: Titan Reach',
    ores: ['titanium', 'lithium'] as const,
    buildings: ['bridge_t3', 'refinery'] as const,
  },
  {
    valley: 4,
    title: 'Valley 4: Aether Crown',
    ores: ['tungsten', 'thorium'] as const,
    buildings: ['bridge_t4', 'lab', 'logistics_hub'] as const,
  },
] as const

export const BASE_ORE_STORAGE_PER_RESOURCE = 120
export const BASE_MATERIAL_STORAGE_PER_RESOURCE = 90
export const STORAGE_BUILDING_ORE_BONUS = 60
export const STORAGE_BUILDING_MATERIAL_BONUS = 45

function isOre(resource: ResourceType): boolean {
  return (ORE_TYPES as readonly string[]).includes(resource)
}

function clampToStorageLimit(amount: number, limit: number): number {
  return Math.min(Math.max(0, amount), Math.max(0, limit))
}

export function getStorageSnapshot(storageBuildings: number): StorageSnapshot {
  const count = Math.max(0, Math.floor(storageBuildings))
  return {
    orePerResource: BASE_ORE_STORAGE_PER_RESOURCE + count * STORAGE_BUILDING_ORE_BONUS,
    materialPerResource: BASE_MATERIAL_STORAGE_PER_RESOURCE + count * STORAGE_BUILDING_MATERIAL_BONUS,
    storageBuildings: count,
  }
}

function getResourceStorageLimit(storage: StorageSnapshot, resource: ResourceType): number {
  return isOre(resource) ? storage.orePerResource : storage.materialPerResource
}

export function storageLimitForResource(snapshot: EconomySnapshot, resource: ResourceType): number {
  return getResourceStorageLimit(snapshot.storage, resource)
}

function getAmount(state: EconomySnapshot, resource: ResourceType): number {
  if (isOre(resource)) return state.inventory[resource as keyof typeof state.inventory] ?? 0
  return state.materials[resource as keyof typeof state.materials] ?? 0
}

function setAmount(state: EconomySnapshot, resource: ResourceType, amount: number): void {
  if (isOre(resource)) {
    state.inventory[resource as keyof typeof state.inventory] = amount
    return
  }
  state.materials[resource as keyof typeof state.materials] = amount
}

export function toEconomySnapshot(state: GameState): EconomySnapshot {
  return {
    inventory: { ...state.inventory },
    materials: { ...state.materials },
    unlocked: { ...state.unlocked },
    storage: getStorageSnapshot(state.storageBuildings),
  }
}

export function canReceiveResource(
  snapshot: EconomySnapshot,
  resource: ResourceType,
  amount: number,
): boolean {
  if (amount <= 0) return true
  const current = getAmount(snapshot, resource)
  const limit = storageLimitForResource(snapshot, resource)
  return current + amount <= limit
}

export function addResource(
  snapshot: EconomySnapshot,
  resource: ResourceType,
  amount: number,
): number {
  if (amount <= 0) return 0
  const current = getAmount(snapshot, resource)
  const limit = storageLimitForResource(snapshot, resource)
  const next = clampToStorageLimit(current + amount, limit)
  const added = Math.max(0, next - current)
  if (added > 0) {
    setAmount(snapshot, resource, next)
  }
  return added
}

export function canAffordCost(snapshot: EconomySnapshot, cost: ResourceCost): boolean {
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    if (getAmount(snapshot, resource) < amount) return false
  }
  return true
}

export function spendCost(snapshot: EconomySnapshot, cost: ResourceCost): boolean {
  if (!canAffordCost(snapshot, cost)) return false
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    const current = getAmount(snapshot, resource)
    setAmount(snapshot, resource, current - amount)
  }
  return true
}

export function addCost(snapshot: EconomySnapshot, cost: ResourceCost): void {
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    addResource(snapshot, resource, amount)
  }
}

export function craftRecipe(state: GameState, recipeId: CraftRecipeId): boolean {
  const recipe = CRAFT_RECIPES[recipeId]
  if (!recipe) return false
  const snapshot = toEconomySnapshot(state)
  if (!isCraftingStationAvailable(snapshot.unlocked, recipe.station)) return false
  if (!canReceiveResource(snapshot, recipe.output.material, recipe.output.amount)) return false
  const spent = spendCost(snapshot, recipe.cost)
  if (!spent) return false
  addResource(snapshot, recipe.output.material, recipe.output.amount)
  state.inventory = snapshot.inventory
  state.materials = snapshot.materials
  return true
}

export function unlockBuild(state: GameState, buildId: BuildableId): boolean {
  if (state.unlocked[buildId]) return false
  const rule = UNLOCK_RULES[buildId]
  if (!rule) return false
  const snapshot = toEconomySnapshot(state)
  const spent = spendCost(snapshot, rule.cost)
  if (!spent) return false
  snapshot.unlocked[buildId] = true
  state.inventory = snapshot.inventory
  state.materials = snapshot.materials
  state.unlocked = snapshot.unlocked
  return true
}

export function spendBuildCost(state: GameState, buildId: BuildableId): boolean {
  const cost = BUILD_COSTS[buildId]
  const snapshot = toEconomySnapshot(state)
  const spent = spendCost(snapshot, cost)
  if (!spent) return false
  state.inventory = snapshot.inventory
  state.materials = snapshot.materials
  return true
}

export function refundBuildCost(state: GameState, buildId: BuildableId): void {
  const cost = BUILD_COSTS[buildId]
  const snapshot = toEconomySnapshot(state)
  addCost(snapshot, cost)
  state.inventory = snapshot.inventory
  state.materials = snapshot.materials
}

export function addResourceToState(state: GameState, resource: ResourceType, amount: number): number {
  const snapshot = toEconomySnapshot(state)
  const added = addResource(snapshot, resource, amount)
  if (added <= 0) return 0
  state.inventory = snapshot.inventory
  state.materials = snapshot.materials
  return added
}

export function clampStateToStorage(state: GameState): void {
  const snapshot = toEconomySnapshot(state)
  for (const ore of ORE_TYPES) {
    const current = snapshot.inventory[ore] ?? 0
    snapshot.inventory[ore] = clampToStorageLimit(current, snapshot.storage.orePerResource)
  }
  for (const [material, amount] of Object.entries(snapshot.materials)) {
    snapshot.materials[material] = clampToStorageLimit(amount, snapshot.storage.materialPerResource)
  }
  state.inventory = snapshot.inventory
  state.materials = snapshot.materials
}

export function isBuildUnlocked(state: GameState, buildId: BuildableId): boolean {
  return state.unlocked[buildId]
}

export function bridgeTierFromBuild(buildId: BuildableId): number {
  return getBridgeTierForBuild(buildId)
}

export function maxUnlockedBridgeTier(unlocked: UnlockState): number {
  let maxTier = 0
  for (const buildId of BUILDABLE_IDS) {
    if (!unlocked[buildId]) continue
    if (!isBridgeBuildId(buildId)) continue
    maxTier = Math.max(maxTier, getBridgeTierForBuild(buildId))
  }
  return maxTier
}
