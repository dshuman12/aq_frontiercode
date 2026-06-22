import {
  CRAFT_RECIPES,
  addResourceToState,
  isCraftingStationAvailable,
} from './economy'
import {
  getBuildFootprint,
  getProcessingBuildIds,
  getProcessingCycleSec,
  isBuildDirectional,
  isDepotInputBuildId,
  isDepotOutputBuildId,
  isProcessingBuildId as isProcessingBuildIdFromCatalog,
} from './buildingCatalog'
import { tick } from './tick'
import {
  ORE_TYPES,
  type BuildableId,
  type CraftRecipeId,
  type Direction,
  type GameState,
  type ResourceType,
} from './types'

const ORE_TYPE_SET = new Set<string>(ORE_TYPES as readonly string[])
const MACHINE_RETRY_SEC = 0.45
const BELT_END_THRESHOLD = 0.95
const PROCESSOR_BUFFER_ITEM_CAP = 64
const LOGISTICS_HUB_BASE_POWER = 200
const BATTERY_FUEL_DURATION_SEC = 60
const RELAY_LINK_DISTANCE_TILES = 10
const POWER_COVERAGE_OFFSETS: Record<'logistics_hub' | 'relay_tower', { min: number; max: number }> = {
  logistics_hub: { min: -6, max: 6 }, // 13x13
  relay_tower: { min: -3, max: 3 }, // 7x7
}

const POWER_DEMAND_BY_BUILD: Partial<Record<BuildableId, number>> = {
  miner: 10,
  drill: 16,
  smelter: 20,
  assembler: 30,
  refinery: 44,
  lab: 62,
}

const BATTERY_POWER_BY_RESOURCE: Array<{ resource: string; power: number }> = [
  { resource: 'battery_t4', power: 260 },
  { resource: 'battery_t3', power: 180 },
  { resource: 'battery_t2', power: 110 },
  { resource: 'battery_t1', power: 70 },
]

const BATTERY_POWER_BY_RESOURCE_MAP = new Map(BATTERY_POWER_BY_RESOURCE.map((entry) => [entry.resource, entry.power]))

const PROCESSING_STATIONS: BuildableId[] = getProcessingBuildIds()
const PROCESSING_STATION_SET = new Set<BuildableId>(PROCESSING_STATIONS)

const INPUT_SIDE_BY_FACING: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
}

const OUTPUT_SIDE_BY_FACING: Record<Direction, Direction> = {
  up: 'up',
  right: 'right',
  down: 'down',
  left: 'left',
}

const DX: Record<Direction, number> = { up: 0, right: 1, down: 0, left: -1 }
const DY: Record<Direction, number> = { up: -1, right: 0, down: 1, left: 0 }

type StructureFootprint = {
  width: number
  height: number
}

export const DEFAULT_PROCESSING_CYCLE_SEC: Partial<Record<BuildableId, number>> =
  PROCESSING_STATIONS.reduce(
    (acc, buildId) => {
      const cycleSec = getProcessingCycleSec(buildId)
      if (cycleSec !== null) {
        acc[buildId] = cycleSec
      }
      return acc
    },
    {} as Partial<Record<BuildableId, number>>,
  )

export type ProcessingStatus =
  | 'idle'
  | 'crafting'
  | 'waiting_power'
  | 'waiting_resources'
  | 'waiting_requirements'
  | 'waiting_output'

export type ProcessingMachineState = {
  buildId: BuildableId
  recipeId: CraftRecipeId | null
  selectedRecipeId: CraftRecipeId | null
  depotOutputResource?: string | null
  generatorFuelResource?: string | null
  generatorFuelSecRemaining?: number
  inputBuffer: Partial<Record<string, number>>
  cycleSec: number
  cooldownSec: number
  status: ProcessingStatus
}

export type ProcessingStructureState = {
  id: string
  buildId: BuildableId
  anchor: { x: number; y: number }
  direction: Direction
}

export type SimulationDynamicState = Pick<
  GameState,
  | 'belts'
  | 'items'
  | 'oreDeposits'
  | 'miners'
  | 'hubs'
  | 'inventory'
  | 'materials'
  | 'unlocked'
  | 'storageBuildings'
  | 'nextId'
>

export type SimulationStepInput = {
  dtSec: number
  accessibleValleyTier: number
  state: SimulationDynamicState
  placedStructures: ProcessingStructureState[]
  processingMachines: Record<string, ProcessingMachineState>
}

export type SimulationStepResult = {
  state: SimulationDynamicState
  processingMachines: Record<string, ProcessingMachineState>
  economyChanged: boolean
  craftedAny: boolean
  power: {
    generated: number
    allocated: number
    demandInCoverage: number
    demandTotal: number
    surplus: number
    deficit: number
  }
}

const RECIPES_BY_STATION: Partial<Record<BuildableId, CraftRecipeId[]>> = Object.values(CRAFT_RECIPES).reduce(
  (acc, recipe) => {
    if (recipe.station === 'manual') return acc
    const stationId = recipe.station as BuildableId
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
  {} as Partial<Record<BuildableId, CraftRecipeId[]>>,
)

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

function isVerticalFacing(direction: Direction): boolean {
  return direction === 'up' || direction === 'down'
}

function isProcessingBuildId(buildId: BuildableId): boolean {
  return isProcessingBuildIdFromCatalog(buildId)
}

function laneUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 1
  return Math.max(1, Math.ceil(amount))
}

function laneResourcesForCost(cost: Partial<Record<string, number>>): string[] {
  const lanes: string[] = []
  const sorted = Object.entries(cost).sort(([left], [right]) => left.localeCompare(right))
  for (const [resource, amount] of sorted) {
    if (amount === undefined) continue
    const count = laneUnits(amount)
    for (let index = 0; index < count; index += 1) {
      lanes.push(resource)
    }
  }
  return lanes
}

function resolveSidePosition(
  side: Direction,
  laneIndex: number,
  laneCount: number,
  footprint: StructureFootprint,
): { edgeX: number; edgeY: number; cellOffset: { x: number; y: number } } {
  const count = Math.max(1, laneCount)
  const progress = (laneIndex + 1) / (count + 1)

  if (side === 'left') {
    const y = progress * footprint.height
    const row = clamp(Math.floor(y), 0, footprint.height - 1)
    return {
      edgeX: 0,
      edgeY: y,
      cellOffset: { x: -1, y: row },
    }
  }

  if (side === 'right') {
    const y = progress * footprint.height
    const row = clamp(Math.floor(y), 0, footprint.height - 1)
    return {
      edgeX: footprint.width,
      edgeY: y,
      cellOffset: { x: footprint.width, y: row },
    }
  }

  if (side === 'up') {
    const x = progress * footprint.width
    const column = clamp(Math.floor(x), 0, footprint.width - 1)
    return {
      edgeX: x,
      edgeY: 0,
      cellOffset: { x: column, y: -1 },
    }
  }

  const x = progress * footprint.width
  const column = clamp(Math.floor(x), 0, footprint.width - 1)
  return {
    edgeX: x,
    edgeY: footprint.height,
    cellOffset: { x: column, y: footprint.height },
  }
}

function getStructureFootprint(buildId: BuildableId, direction: Direction): StructureFootprint {
  const base = getBuildFootprint(buildId)
  if (!isBuildDirectional(buildId) || !isVerticalFacing(direction)) return base
  return {
    width: base.height,
    height: base.width,
  }
}

function recipeIngredientEntries(recipeId: CraftRecipeId | null): Array<[string, number]> {
  if (!recipeId) return []
  const recipe = CRAFT_RECIPES[recipeId]
  if (!recipe) return []
  return Object.entries(recipe.cost).flatMap(([resource, amount]) => {
    if (amount === undefined || amount <= 0) return []
    return [[resource, amount] as [string, number]]
  })
}

function getStateResourceAmount(state: GameState, resource: string): number {
  if (ORE_TYPE_SET.has(resource)) {
    return state.inventory[resource as keyof typeof state.inventory] ?? 0
  }
  return state.materials[resource] ?? 0
}

function spendStateResource(state: GameState, resource: string, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const current = getStateResourceAmount(state, resource)
  const spent = Math.min(current, amount)
  if (spent <= 0) return 0
  if (ORE_TYPE_SET.has(resource)) {
    state.inventory[resource as keyof typeof state.inventory] = current - spent
  } else {
    state.materials[resource] = current - spent
  }
  return spent
}

function hasBufferedIngredients(machine: ProcessingMachineState, recipeId: CraftRecipeId): boolean {
  for (const [resource, required] of recipeIngredientEntries(recipeId)) {
    if ((machine.inputBuffer[resource] ?? 0) + 1e-9 < required) return false
  }
  return true
}

function consumeBufferedIngredients(machine: ProcessingMachineState, recipeId: CraftRecipeId): void {
  for (const [resource, required] of recipeIngredientEntries(recipeId)) {
    const current = machine.inputBuffer[resource] ?? 0
    const next = current - required
    if (next > 1e-9) {
      machine.inputBuffer[resource] = next
    } else {
      delete machine.inputBuffer[resource]
    }
  }
}

function getBufferedItemCount(machine: ProcessingMachineState): number {
  let total = 0
  for (const amount of Object.values(machine.inputBuffer)) {
    if (!Number.isFinite(amount) || (amount ?? 0) <= 0) continue
    total += amount ?? 0
  }
  return total
}

function toTickState(dynamicState: SimulationDynamicState): GameState {
  return {
    belts: dynamicState.belts,
    items: dynamicState.items,
    oreDeposits: dynamicState.oreDeposits,
    miners: dynamicState.miners,
    hubs: dynamicState.hubs,
    inventory: dynamicState.inventory,
    materials: dynamicState.materials,
    unlocked: dynamicState.unlocked,
    storageBuildings: dynamicState.storageBuildings,
    terrain: {},
    bridgeSlots: {},
    bridges: {},
    valleySeed: 0,
    nextId: dynamicState.nextId,
  }
}

function fromTickState(state: GameState): SimulationDynamicState {
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

function cloneMachine(machine: ProcessingMachineState): ProcessingMachineState {
  return {
    ...machine,
    depotOutputResource: machine.depotOutputResource ?? null,
    generatorFuelResource: machine.generatorFuelResource ?? null,
    generatorFuelSecRemaining: Math.max(0, machine.generatorFuelSecRemaining ?? 0),
    inputBuffer: { ...machine.inputBuffer },
  }
}

function getProcessingInputAdjacency(
  anchor: { x: number; y: number },
  buildId: BuildableId,
  direction: Direction,
  recipeId: CraftRecipeId | null,
): Array<{ resource: string; cellX: number; cellY: number }> {
  const recipe = recipeId ? CRAFT_RECIPES[recipeId] : null
  if (!recipe) return []

  const footprint = getStructureFootprint(buildId, direction)
  const inputSide = INPUT_SIDE_BY_FACING[direction]
  const inputLanes = laneResourcesForCost(recipe.cost)

  return inputLanes.map((resource, index) => {
    const sidePos = resolveSidePosition(inputSide, index, inputLanes.length, footprint)
    return {
      resource,
      cellX: anchor.x + sidePos.cellOffset.x,
      cellY: anchor.y + sidePos.cellOffset.y,
    }
  })
}

function getProcessingOutputAdjacency(
  anchor: { x: number; y: number },
  buildId: BuildableId,
  direction: Direction,
  recipeId: CraftRecipeId | null,
): Array<{ resource: string; cellX: number; cellY: number }> {
  const recipe = recipeId ? CRAFT_RECIPES[recipeId] : null
  if (!recipe) return []

  const footprint = getStructureFootprint(buildId, direction)
  const outputSide = OUTPUT_SIDE_BY_FACING[direction]
  const outputLaneCount = laneUnits(recipe.output.amount)

  return Array.from({ length: outputLaneCount }, (_, index) => {
    const sidePos = resolveSidePosition(outputSide, index, outputLaneCount, footprint)
    return {
      resource: recipe.output.material,
      cellX: anchor.x + sidePos.cellOffset.x,
      cellY: anchor.y + sidePos.cellOffset.y,
    }
  })
}

function getDepotInAdjacency(
  anchor: { x: number; y: number },
  footprint: StructureFootprint,
): Array<{ x: number; y: number }> {
  const cells = new Map<string, { x: number; y: number }>()
  const add = (x: number, y: number) => {
    cells.set(cellKey(x, y), { x, y })
  }

  for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
    add(anchor.x + offsetX, anchor.y - 1)
    add(anchor.x + offsetX, anchor.y + footprint.height)
  }

  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    add(anchor.x - 1, anchor.y + offsetY)
    add(anchor.x + footprint.width, anchor.y + offsetY)
  }

  return [...cells.values()]
}

function getDepotOutOutputAdjacency(
  anchor: { x: number; y: number },
  buildId: BuildableId,
  direction: Direction,
): Array<{ x: number; y: number }> {
  const footprint = getStructureFootprint(buildId, direction)
  const cells: Array<{ x: number; y: number }> = []
  if (direction === 'up') {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      cells.push({ x: anchor.x + offsetX, y: anchor.y - 1 })
    }
    return cells
  }
  if (direction === 'down') {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      cells.push({ x: anchor.x + offsetX, y: anchor.y + footprint.height })
    }
    return cells
  }
  if (direction === 'left') {
    for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
      cells.push({ x: anchor.x - 1, y: anchor.y + offsetY })
    }
    return cells
  }
  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    cells.push({ x: anchor.x + footprint.width, y: anchor.y + offsetY })
  }
  return cells
}

function chooseDepotOutputResource(
  state: GameState,
  belt: { x: number; y: number; dir: Direction },
  demandByCell: Map<string, Set<string>>,
  preferredResource: ResourceType | null = null,
): ResourceType | null {
  if (preferredResource && getStateResourceAmount(state, preferredResource) > 0) {
    return preferredResource
  }
  const nextCellKey = cellKey(belt.x + DX[belt.dir], belt.y + DY[belt.dir])
  const demanded = demandByCell.get(nextCellKey)

  if (demanded && demanded.size > 0) {
    const demandedList = [...demanded]
    demandedList.sort((left, right) => getStateResourceAmount(state, right) - getStateResourceAmount(state, left))
    for (const resource of demandedList) {
      if (getStateResourceAmount(state, resource) > 0) {
        return resource as ResourceType
      }
    }
    return null
  }

  let bestResource: string | null = null
  let bestAmount = 0
  for (const ore of ORE_TYPES) {
    const amount = state.inventory[ore] ?? 0
    if (amount > bestAmount) {
      bestAmount = amount
      bestResource = ore
    }
  }
  for (const [resource, amount] of Object.entries(state.materials)) {
    if (amount > bestAmount) {
      bestAmount = amount
      bestResource = resource
    }
  }

  if (!bestResource || bestAmount <= 0) return null
  return bestResource as ResourceType
}

function addPowerCoverageCells(
  poweredCells: Set<string>,
  anchor: { x: number; y: number },
  footprint: StructureFootprint,
  sourceBuildId: BuildableId,
): void {
  if (sourceBuildId !== 'logistics_hub' && sourceBuildId !== 'relay_tower') return
  const offsets = POWER_COVERAGE_OFFSETS[sourceBuildId]
  for (let fx = 0; fx < footprint.width; fx += 1) {
    for (let fy = 0; fy < footprint.height; fy += 1) {
      const originX = anchor.x + fx
      const originY = anchor.y + fy
      for (let dx = offsets.min; dx <= offsets.max; dx += 1) {
        for (let dy = offsets.min; dy <= offsets.max; dy += 1) {
          poweredCells.add(cellKey(originX + dx, originY + dy))
        }
      }
    }
  }
}

function structureCenter(
  anchor: { x: number; y: number },
  footprint: StructureFootprint,
): { x: number; y: number } {
  return {
    x: anchor.x + footprint.width * 0.5,
    y: anchor.y + footprint.height * 0.5,
  }
}

function getPowerDemandForMinerKind(kind: 'miner' | 'drill'): number {
  return POWER_DEMAND_BY_BUILD[kind] ?? 0
}

function getPowerDemandForStructureBuild(buildId: BuildableId): number {
  return POWER_DEMAND_BY_BUILD[buildId] ?? 0
}

export function simulateStep(input: SimulationStepInput): SimulationStepResult {
  const resolvedDtSec = Math.max(0, Math.min(0.08, input.dtSec))
  const preTickState = toTickState(input.state)
  const accessibleValleyTier = Number.isFinite(input.accessibleValleyTier)
    ? Math.max(1, Math.floor(input.accessibleValleyTier))
    : 1

  let craftedAny = false
  let economyChanged = false
  const nextProcessingMachines: Record<string, ProcessingMachineState> = {}
  const placedStructures = input.placedStructures
  const processingStructures = placedStructures.filter((structure) => isProcessingBuildId(structure.buildId))

  const poweredCells = new Set<string>()
  let totalGeneratedPower = 0

  const logisticsHubs = placedStructures.filter((structure) => structure.buildId === 'logistics_hub')
  totalGeneratedPower += logisticsHubs.length * LOGISTICS_HUB_BASE_POWER
  const energizedProviderCenters: Array<{ x: number; y: number }> = []
  for (const hub of logisticsHubs) {
    const hubFootprint = getStructureFootprint(hub.buildId, hub.direction)
    addPowerCoverageCells(poweredCells, hub.anchor, hubFootprint, hub.buildId)
    energizedProviderCenters.push(structureCenter(hub.anchor, hubFootprint))
  }

  const relayTowers = placedStructures.filter((structure) => structure.buildId === 'relay_tower')
  const energizedRelayIds = new Set<string>()
  const maxRelayLinkDistanceSq = RELAY_LINK_DISTANCE_TILES * RELAY_LINK_DISTANCE_TILES
  let activatedRelayInPass = true
  while (activatedRelayInPass) {
    activatedRelayInPass = false
    for (const relay of relayTowers) {
      if (energizedRelayIds.has(relay.id)) continue
      const relayFootprint = getStructureFootprint(relay.buildId, relay.direction)
      const relayCenter = structureCenter(relay.anchor, relayFootprint)
      let linkInRange = false
      for (const providerCenter of energizedProviderCenters) {
        const dx = relayCenter.x - providerCenter.x
        const dy = relayCenter.y - providerCenter.y
        if (dx * dx + dy * dy <= maxRelayLinkDistanceSq + 1e-9) {
          linkInRange = true
          break
        }
      }
      if (!linkInRange) continue
      addPowerCoverageCells(poweredCells, relay.anchor, relayFootprint, relay.buildId)
      energizedRelayIds.add(relay.id)
      energizedProviderCenters.push(relayCenter)
      activatedRelayInPass = true
    }
  }

  const generatorStructures = placedStructures.filter((structure) => structure.buildId === 'generator')
  for (const generator of generatorStructures) {
    const existingMachine = input.processingMachines[generator.id]
    const machine: ProcessingMachineState =
      existingMachine && existingMachine.buildId === generator.buildId
        ? cloneMachine(existingMachine)
        : {
            buildId: generator.buildId,
            recipeId: null,
            selectedRecipeId: null,
            depotOutputResource: null,
            generatorFuelResource: null,
            generatorFuelSecRemaining: 0,
            inputBuffer: {},
            cycleSec: BATTERY_FUEL_DURATION_SEC,
            cooldownSec: 0,
            status: 'idle',
          }

    machine.generatorFuelSecRemaining = Math.max(0, (machine.generatorFuelSecRemaining ?? 0) - resolvedDtSec)
    if ((machine.generatorFuelSecRemaining ?? 0) <= 0) machine.generatorFuelResource = null

    if ((machine.generatorFuelSecRemaining ?? 0) > 0 && machine.generatorFuelResource) {
      const batteryPower = BATTERY_POWER_BY_RESOURCE_MAP.get(machine.generatorFuelResource)
      if (batteryPower) {
        totalGeneratedPower += batteryPower
      }
      machine.status = 'crafting'
    } else {
      machine.status = 'waiting_resources'
    }

    nextProcessingMachines[generator.id] = machine
  }

  let remainingPower = totalGeneratedPower
  let powerDemandTotal = 0
  let powerDemandInCoverage = 0
  const poweredMinerIds = new Set<string>()
  const sortedMiners = [...preTickState.miners].sort((left, right) => left.id.localeCompare(right.id))
  for (const miner of sortedMiners) {
    const demand = getPowerDemandForMinerKind(miner.kind)
    powerDemandTotal += demand
    if (!poweredCells.has(cellKey(miner.x, miner.y))) continue
    powerDemandInCoverage += demand
    if (remainingPower + 1e-9 < demand) continue
    remainingPower -= demand
    poweredMinerIds.add(miner.id)
  }

  const poweredProcessingStructureIds = new Set<string>()
  const sortedProcessingStructures = [...processingStructures].sort((left, right) => left.id.localeCompare(right.id))
  for (const structure of sortedProcessingStructures) {
    const demand = getPowerDemandForStructureBuild(structure.buildId)
    powerDemandTotal += demand
    const footprint = getStructureFootprint(structure.buildId, structure.direction)
    let inCoverage = false
    for (let fx = 0; fx < footprint.width && !inCoverage; fx += 1) {
      for (let fy = 0; fy < footprint.height && !inCoverage; fy += 1) {
        if (poweredCells.has(cellKey(structure.anchor.x + fx, structure.anchor.y + fy))) {
          inCoverage = true
        }
      }
    }
    if (!inCoverage) continue
    powerDemandInCoverage += demand
    if (remainingPower + 1e-9 < demand) continue
    remainingPower -= demand
    poweredProcessingStructureIds.add(structure.id)
  }

  const state = tick(preTickState, resolvedDtSec, { poweredMinerIds })

  const beltByCell = new Map(state.belts.map((belt) => [cellKey(belt.x, belt.y), belt]))
  const removedItemIds = new Set<string>()
  const itemByBeltId = new Map<string, (typeof state.items)[number]>()
  for (const item of state.items) {
    if (!itemByBeltId.has(item.beltId)) {
      itemByBeltId.set(item.beltId, item)
    }
  }

  const demandByCell = new Map<string, Set<string>>()

  for (const structure of processingStructures) {
    const stationRecipes = RECIPES_BY_STATION[structure.buildId]
    if (!stationRecipes || stationRecipes.length === 0) continue
    const existingMachine = input.processingMachines[structure.id]
    const recipeId =
      existingMachine?.selectedRecipeId && stationRecipes.includes(existingMachine.selectedRecipeId)
        ? existingMachine.selectedRecipeId
        : existingMachine?.recipeId && stationRecipes.includes(existingMachine.recipeId)
          ? existingMachine.recipeId
          : stationRecipes[0]

    const inputPorts = getProcessingInputAdjacency(structure.anchor, structure.buildId, structure.direction, recipeId)
    for (const port of inputPorts) {
      const key = cellKey(port.cellX, port.cellY)
      const bucket = demandByCell.get(key) ?? new Set<string>()
      bucket.add(port.resource)
      demandByCell.set(key, bucket)
    }
  }

  const getConsumableEndItem = (beltId: string) => {
    const item = itemByBeltId.get(beltId)
    if (!item) return null
    if (removedItemIds.has(item.id)) return null
    if (item.progress < BELT_END_THRESHOLD) return null
    return item
  }

  for (const structure of placedStructures) {
    if (structure.buildId === 'generator') {
      const existingMachine = nextProcessingMachines[structure.id] ?? input.processingMachines[structure.id]
      const machine =
        existingMachine && existingMachine.buildId === structure.buildId
          ? cloneMachine(existingMachine)
          : {
              buildId: structure.buildId,
              recipeId: null,
              selectedRecipeId: null,
              depotOutputResource: null,
              generatorFuelResource: null,
              generatorFuelSecRemaining: 0,
              inputBuffer: {},
              cycleSec: BATTERY_FUEL_DURATION_SEC,
              cooldownSec: 0,
              status: 'idle' as ProcessingStatus,
            }

      if ((machine.generatorFuelSecRemaining ?? 0) <= 0) {
        machine.generatorFuelResource = null
        const intakeCells = getDepotInAdjacency(
          structure.anchor,
          getStructureFootprint(structure.buildId, structure.direction),
        )
        for (const intakeCell of intakeCells) {
          const belt = beltByCell.get(cellKey(intakeCell.x, intakeCell.y))
          if (!belt) continue
          const item = getConsumableEndItem(belt.id)
          if (!item) continue
          const batteryPower = BATTERY_POWER_BY_RESOURCE_MAP.get(item.resource)
          if (!batteryPower) continue
          removedItemIds.add(item.id)
          machine.generatorFuelResource = item.resource
          machine.generatorFuelSecRemaining = BATTERY_FUEL_DURATION_SEC
          break
        }
      }

      machine.status = (machine.generatorFuelSecRemaining ?? 0) > 0 ? 'crafting' : 'waiting_resources'
      nextProcessingMachines[structure.id] = machine
      continue
    }

    if (isDepotInputBuildId(structure.buildId)) {
      const intakeCells = getDepotInAdjacency(
        structure.anchor,
        getStructureFootprint(structure.buildId, structure.direction),
      )
      for (const intakeCell of intakeCells) {
        const belt = beltByCell.get(cellKey(intakeCell.x, intakeCell.y))
        if (!belt) continue
        const item = getConsumableEndItem(belt.id)
        if (!item) continue
        const added = addResourceToState(state, item.resource, 1)
        if (added <= 0) continue
        removedItemIds.add(item.id)
        economyChanged = true
      }
      continue
    }

    if (isDepotOutputBuildId(structure.buildId)) {
      const existingMachine = input.processingMachines[structure.id]
      const preferredResource = existingMachine?.depotOutputResource ?? null
      const outputCells = getDepotOutOutputAdjacency(structure.anchor, structure.buildId, structure.direction)
      for (const outputCell of outputCells) {
        const belt = beltByCell.get(cellKey(outputCell.x, outputCell.y))
        if (!belt) continue
        const occupied = itemByBeltId.get(belt.id)
        if (occupied && !removedItemIds.has(occupied.id)) continue

        const resource = chooseDepotOutputResource(
          state,
          belt,
          demandByCell,
          preferredResource as ResourceType | null,
        )
        if (!resource) continue
        const spent = spendStateResource(state, resource, 1)
        if (spent <= 0) continue

        const item = {
          id: `e${state.nextId}`,
          resource,
          beltId: belt.id,
          progress: 0,
        }
        state.nextId += 1
        state.items.push(item)
        itemByBeltId.set(belt.id, item)
        economyChanged = true
      }
      if (existingMachine && existingMachine.buildId === structure.buildId) {
        nextProcessingMachines[structure.id] = cloneMachine(existingMachine)
      }
      continue
    }

    if (!isProcessingBuildId(structure.buildId)) continue

    const stationRecipes = RECIPES_BY_STATION[structure.buildId]
    if (!stationRecipes || stationRecipes.length === 0) continue

    const existingMachine = input.processingMachines[structure.id]
    const machine =
      existingMachine && existingMachine.buildId === structure.buildId
        ? cloneMachine(existingMachine)
        : {
            buildId: structure.buildId,
            recipeId: stationRecipes[0],
            selectedRecipeId: null,
            depotOutputResource: null,
            generatorFuelResource: null,
            generatorFuelSecRemaining: 0,
            inputBuffer: {},
            cycleSec: DEFAULT_PROCESSING_CYCLE_SEC[structure.buildId] ?? 2.8,
            cooldownSec: 0.2,
            status: 'idle' as ProcessingStatus,
          }

    if (!poweredProcessingStructureIds.has(structure.id)) {
      machine.status = 'waiting_power'
      nextProcessingMachines[structure.id] = machine
      continue
    }

    if (machine.selectedRecipeId && !stationRecipes.includes(machine.selectedRecipeId)) {
      machine.selectedRecipeId = null
    }

    if (!machine.recipeId || !stationRecipes.includes(machine.recipeId)) {
      machine.recipeId = machine.selectedRecipeId ?? stationRecipes[0]
    }

    const inputPorts = getProcessingInputAdjacency(
      structure.anchor,
      structure.buildId,
      structure.direction,
      machine.recipeId,
    )
    let bufferedItemCount = getBufferedItemCount(machine)
    for (const port of inputPorts) {
      if (bufferedItemCount + 1e-9 >= PROCESSOR_BUFFER_ITEM_CAP) break
      const belt = beltByCell.get(cellKey(port.cellX, port.cellY))
      if (!belt) continue
      const item = getConsumableEndItem(belt.id)
      if (!item) continue
      if (item.resource !== port.resource) continue
      machine.inputBuffer[port.resource] = (machine.inputBuffer[port.resource] ?? 0) + 1
      removedItemIds.add(item.id)
      bufferedItemCount += 1
    }

    machine.cooldownSec = Math.max(0, machine.cooldownSec - resolvedDtSec)
    if (machine.cooldownSec > 0) {
      nextProcessingMachines[structure.id] = machine
      continue
    }

    const candidateIds = machine.selectedRecipeId
      ? [machine.selectedRecipeId]
      : machine.recipeId
        ? [machine.recipeId, ...stationRecipes.filter((recipeId) => recipeId !== machine.recipeId)]
        : [...stationRecipes]
    let crafted = false
    let blockedByResources = false
    let blockedByRequirements = false
    let blockedByOutput = false

    for (const recipeId of candidateIds) {
      const recipe = CRAFT_RECIPES[recipeId]
      if (!recipe) continue
      const requirementsMet =
        accessibleValleyTier >= recipe.valley && isCraftingStationAvailable(state.unlocked, recipe.station)
      if (!requirementsMet) {
        blockedByRequirements = true
        continue
      }
      machine.recipeId = recipeId

      if (!hasBufferedIngredients(machine, recipeId)) {
        blockedByResources = true
        continue
      }

      const outputPorts = getProcessingOutputAdjacency(
        structure.anchor,
        structure.buildId,
        structure.direction,
        recipeId,
      )
      if (outputPorts.length === 0) {
        blockedByOutput = true
        continue
      }

      const plannedOutputs: Array<{ beltId: string; resource: ResourceType }> = []
      const plannedBeltIds = new Set<string>()
      const outputCount = laneUnits(recipe.output.amount)
      for (const port of outputPorts) {
        if (plannedOutputs.length >= outputCount) break
        const belt = beltByCell.get(cellKey(port.cellX, port.cellY))
        if (!belt) continue
        if (plannedBeltIds.has(belt.id)) continue
        const occupied = itemByBeltId.get(belt.id)
        if (occupied && !removedItemIds.has(occupied.id)) continue
        plannedBeltIds.add(belt.id)
        plannedOutputs.push({
          beltId: belt.id,
          resource: port.resource as ResourceType,
        })
      }
      if (plannedOutputs.length < outputCount) {
        blockedByOutput = true
        continue
      }

      consumeBufferedIngredients(machine, recipeId)
      for (const output of plannedOutputs) {
        const item = {
          id: `e${state.nextId}`,
          resource: output.resource,
          beltId: output.beltId,
          progress: 0,
        }
        state.nextId += 1
        state.items.push(item)
        itemByBeltId.set(output.beltId, item)
      }

      machine.status = 'crafting'
      machine.cooldownSec = machine.cycleSec
      craftedAny = true
      crafted = true
      break
    }

    if (!crafted) {
      if (blockedByResources) {
        machine.status = 'waiting_resources'
      } else if (blockedByOutput) {
        machine.status = 'waiting_output'
      } else if (blockedByRequirements) {
        machine.status = 'waiting_requirements'
      } else {
        machine.status = 'idle'
      }
      machine.cooldownSec = MACHINE_RETRY_SEC
    }

    nextProcessingMachines[structure.id] = machine
  }

  if (removedItemIds.size > 0) {
    state.items = state.items.filter((item) => !removedItemIds.has(item.id))
  }

  const allocatedPower = Math.max(0, totalGeneratedPower - remainingPower)
  const deficitPower = Math.max(0, powerDemandInCoverage - allocatedPower)

  return {
    state: fromTickState(state),
    processingMachines: nextProcessingMachines,
    economyChanged,
    craftedAny,
    power: {
      generated: totalGeneratedPower,
      allocated: allocatedPower,
      demandInCoverage: powerDemandInCoverage,
      demandTotal: powerDemandTotal,
      surplus: Math.max(0, remainingPower),
      deficit: deficitPower,
    },
  }
}
