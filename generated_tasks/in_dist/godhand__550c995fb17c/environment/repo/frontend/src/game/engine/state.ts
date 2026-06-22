import { EMPTY_MATERIALS, STARTING_UNLOCKS } from './economy'
import type {
  Belt,
  BuildableId,
  Direction,
  GameState,
  GridPos,
  Hub,
  Inventory,
  Miner,
  OreDeposit,
  OreType,
  ResourceType,
} from './types'
import { generateSeededWorld } from './worldgen'

const NEIGHBOR_STEPS: GridPos[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function normalizeBridgeTier(tier: number): number {
  if (!Number.isFinite(tier)) return 1
  return Math.max(1, Math.floor(tier))
}

function createInventory(): Inventory {
  return {
    iron: 0,
    copper: 0,
    coal: 0,
    silica: 0,
    aluminum: 0,
    titanium: 0,
    lithium: 0,
    tungsten: 0,
    thorium: 0,
  }
}

export function createState(): GameState {
  return {
    belts: [],
    items: [],
    oreDeposits: [],
    miners: [],
    hubs: [],
    inventory: createInventory(),
    materials: { ...EMPTY_MATERIALS },
    unlocked: { ...STARTING_UNLOCKS },
    storageBuildings: 0,
    terrain: {},
    bridgeSlots: {},
    bridges: {},
    valleySeed: 130013,
    nextId: 1,
  }
}

export function nextId(state: GameState): string {
  const id = `e${state.nextId}`
  state.nextId += 1
  return id
}

export function getBeltAt(state: GameState, x: number, y: number): Belt | undefined {
  return state.belts.find((b) => b.x === x && b.y === y)
}

export function getBeltById(state: GameState, id: string): Belt | undefined {
  return state.belts.find((b) => b.id === id)
}

export function removeBeltAt(state: GameState, x: number, y: number): boolean {
  const removedBeltIds = state.belts.filter((belt) => belt.x === x && belt.y === y).map((belt) => belt.id)
  if (removedBeltIds.length === 0) return false

  const removedSet = new Set(removedBeltIds)
  state.belts = state.belts.filter((belt) => !removedSet.has(belt.id))
  state.items = state.items.filter((item) => !removedSet.has(item.beltId))
  return true
}

export function addBelt(
  state: GameState,
  x: number,
  y: number,
  dir: Belt['dir'],
  buildId: BuildableId = 'conveyor',
): Belt {
  const existing = getBeltAt(state, x, y)
  if (existing) {
    state.belts = state.belts.filter((b) => b.id !== existing.id)
  }
  const resolvedBuildId = buildId === 'splitter' ? 'splitter' : 'conveyor'
  const belt: Belt = {
    id: nextId(state),
    x,
    y,
    dir,
    buildId: resolvedBuildId,
    splitterNextOutputIndex: resolvedBuildId === 'splitter' ? 0 : undefined,
  }
  state.belts.push(belt)
  return belt
}

export function getOreDepositAt(state: GameState, x: number, y: number): OreDeposit | undefined {
  return state.oreDeposits.find((deposit) => deposit.x === x && deposit.y === y)
}

export function addOreDeposit(
  state: GameState,
  x: number,
  y: number,
  ore: OreType,
  richness: number,
): OreDeposit {
  const existing = getOreDepositAt(state, x, y)
  if (existing) {
    existing.ore = ore
    existing.richness = richness
    return existing
  }
  const deposit: OreDeposit = {
    id: nextId(state),
    x,
    y,
    ore,
    richness,
  }
  state.oreDeposits.push(deposit)
  return deposit
}

export function getHubAt(state: GameState, x: number, y: number): Hub | undefined {
  return state.hubs.find((hub) => hub.x === x && hub.y === y)
}

export function addHub(state: GameState, x: number, y: number): Hub {
  const existing = getHubAt(state, x, y)
  if (existing) return existing
  const hub: Hub = {
    id: nextId(state),
    x,
    y,
  }
  state.hubs.push(hub)
  return hub
}

export function getMinerAt(state: GameState, x: number, y: number): Miner | undefined {
  return state.miners.find((miner) => miner.x === x && miner.y === y)
}

export function removeMinerAt(state: GameState, x: number, y: number): boolean {
  const before = state.miners.length
  state.miners = state.miners.filter((miner) => miner.x !== x || miner.y !== y)
  return state.miners.length !== before
}

export function addMiner(
  state: GameState,
  x: number,
  y: number,
  outputDir: Direction,
  kind: Miner['kind'] = 'miner',
): Miner | undefined {
  const deposit = getOreDepositAt(state, x, y)
  if (!deposit || deposit.richness <= 0) return undefined

  const cycleSec = kind === 'drill' ? 0.48 : 1.1
  const existing = getMinerAt(state, x, y)
  if (existing) {
    existing.outputDir = outputDir
    existing.kind = kind
    existing.cycleSec = cycleSec
    existing.ore = deposit.ore
    return existing
  }

  const miner: Miner = {
    id: nextId(state),
    x,
    y,
    ore: deposit.ore,
    kind,
    outputDir,
    cycleSec,
    cooldownSec: 0,
  }
  state.miners.push(miner)
  return miner
}

export function spawnItem(state: GameState, beltId: string, resource: ResourceType): void {
  const belt = getBeltById(state, beltId)
  if (!belt) return
  const hasItem = state.items.some((item) => item.beltId === beltId)
  if (hasItem) return
  state.items.push({
    id: nextId(state),
    resource,
    beltId,
    progress: 0,
  })
}

export function getTerrainValleyAt(state: GameState, x: number, y: number): number | undefined {
  return state.terrain[cellKey(x, y)]
}

export function getBridgeSlotTierAt(state: GameState, x: number, y: number): number | undefined {
  return state.bridgeSlots[cellKey(x, y)]
}

export function getBridgeTierAt(state: GameState, x: number, y: number): number | undefined {
  return state.bridges[cellKey(x, y)]
}

export function isLandCell(state: GameState, x: number, y: number): boolean {
  return getTerrainValleyAt(state, x, y) !== undefined
}

export function isTraversableCell(state: GameState, x: number, y: number, maxBridgeTier: number): boolean {
  const valley = getTerrainValleyAt(state, x, y)
  if (valley !== undefined) return valley <= Math.max(1, maxBridgeTier)
  const bridgeTier = getBridgeTierAt(state, x, y)
  if (bridgeTier !== undefined) return bridgeTier <= maxBridgeTier
  return false
}

export function buildReachableSet(state: GameState, maxBridgeTier: number): Set<string> {
  const visited = new Set<string>()
  const queue: GridPos[] = []
  for (const hub of state.hubs) {
    if (!isTraversableCell(state, hub.x, hub.y, maxBridgeTier)) continue
    const key = cellKey(hub.x, hub.y)
    visited.add(key)
    queue.push({ x: hub.x, y: hub.y })
  }
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    for (const step of NEIGHBOR_STEPS) {
      const nx = current.x + step.x
      const ny = current.y + step.y
      if (!isTraversableCell(state, nx, ny, maxBridgeTier)) continue
      const key = cellKey(nx, ny)
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({ x: nx, y: ny })
    }
  }
  return visited
}

export function isReachableCell(state: GameState, x: number, y: number, maxBridgeTier: number): boolean {
  return buildReachableSet(state, maxBridgeTier).has(cellKey(x, y))
}

export function resolveAccessibleBridgeTier(state: GameState, unlockedBridgeTier: number): number {
  const unlockedTier = normalizeBridgeTier(unlockedBridgeTier)
  let accessibleTier = 1

  while (accessibleTier < unlockedTier) {
    const candidateTier = accessibleTier + 1
    const reachable = buildReachableSet(state, candidateTier)
    let reachedCandidateValley = false
    let usedCandidateBridge = false

    for (const key of reachable) {
      if (!reachedCandidateValley && state.terrain[key] === candidateTier) {
        reachedCandidateValley = true
      }
      if (!usedCandidateBridge && state.bridges[key] === candidateTier) {
        usedCandidateBridge = true
      }
      if (reachedCandidateValley && usedCandidateBridge) break
    }

    if (!reachedCandidateValley || !usedCandidateBridge) break
    accessibleTier = candidateTier
  }

  return accessibleTier
}

export function resolvePlaceableBridgeTier(state: GameState, unlockedBridgeTier: number): number {
  const unlockedTier = normalizeBridgeTier(unlockedBridgeTier)
  const accessibleTier = resolveAccessibleBridgeTier(state, unlockedTier)
  return Math.min(unlockedTier, accessibleTier + 1)
}

export function placeBridgeTile(
  state: GameState,
  x: number,
  y: number,
  bridgeTier: number,
  maxPlaceableBridgeTier: number,
): boolean {
  if (!canPlaceBridgeTile(state, x, y, bridgeTier, maxPlaceableBridgeTier)) return false
  state.bridges[cellKey(x, y)] = Math.floor(bridgeTier)
  return true
}

export function canPlaceBridgeTile(
  state: GameState,
  x: number,
  y: number,
  bridgeTier: number,
  maxPlaceableBridgeTier: number,
): boolean {
  const key = cellKey(x, y)
  if (state.terrain[key] !== undefined) return false
  if (state.bridges[key] !== undefined) return false
  if (!Number.isFinite(bridgeTier) || bridgeTier < 1) return false
  const resolvedTier = Math.floor(bridgeTier)
  if (resolvedTier > maxPlaceableBridgeTier) return false
  const reachable = buildReachableSet(state, maxPlaceableBridgeTier)
  let hasReachableNeighbor = false
  for (const step of NEIGHBOR_STEPS) {
    const nx = x + step.x
    const ny = y + step.y
    if (reachable.has(cellKey(nx, ny))) {
      hasReachableNeighbor = true
      break
    }
  }
  if (!hasReachableNeighbor) return false
  return true
}

export function seedDemoWorld(state: GameState): void {
  if (state.hubs.length > 0 || state.oreDeposits.length > 0) return

  const world = generateSeededWorld(state.valleySeed)
  state.terrain = world.terrain
  state.bridgeSlots = world.bridgeSlots

  addHub(state, world.hub.x, world.hub.y)

  for (const deposit of world.deposits) {
    addOreDeposit(state, deposit.x, deposit.y, deposit.ore, deposit.richness)
  }
  for (const belt of world.starterBelts) {
    addBelt(state, belt.x, belt.y, belt.dir)
  }
  for (const miner of world.starterMiners) {
    addMiner(state, miner.x, miner.y, miner.dir, miner.kind)
  }

  state.inventory = {
    ...state.inventory,
    ...world.starterInventory,
  }
}
