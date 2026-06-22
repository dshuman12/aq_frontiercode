import type { Belt, Direction, GameState } from './types'
import { addResourceToState } from './economy'
import { nextId } from './state'

const CELLS_PER_SECOND = 2
const DX: Record<Direction, number> = { up: 0, right: 1, down: 0, left: -1 }
const DY: Record<Direction, number> = { up: -1, right: 0, down: 1, left: 0 }
const LEFT_OF: Record<Direction, Direction> = {
  up: 'left',
  right: 'up',
  down: 'right',
  left: 'down',
}
const RIGHT_OF: Record<Direction, Direction> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function chooseSplitterOutput(
  splitter: Belt,
  beltByCell: Map<string, Belt>,
  occupiedBeltIds: Set<string>,
): { beltId: string; nextOutputIndex: number } | null {
  const outputDirs: Direction[] = [splitter.dir, LEFT_OF[splitter.dir], RIGHT_OF[splitter.dir]]
  const startIndex = splitter.splitterNextOutputIndex ?? 0
  for (let offset = 0; offset < outputDirs.length; offset += 1) {
    const outputIndex = (startIndex + offset) % outputDirs.length
    const outDir = outputDirs[outputIndex]
    const nextX = splitter.x + DX[outDir]
    const nextY = splitter.y + DY[outDir]
    const nextBelt = beltByCell.get(cellKey(nextX, nextY))
    if (!nextBelt) continue
    if (occupiedBeltIds.has(nextBelt.id)) continue
    return {
      beltId: nextBelt.id,
      nextOutputIndex: (outputIndex + 1) % outputDirs.length,
    }
  }
  return null
}

type TickOptions = {
  poweredMinerIds?: Set<string>
}

export function tick(state: GameState, dtSec: number, options: TickOptions = {}): GameState {
  const nextItems = state.items.map((item) => ({ ...item }))
  const nextBelts = state.belts.map((belt) => ({ ...belt }))
  const nextOreDeposits = state.oreDeposits.map((deposit) => ({ ...deposit }))
  const nextMiners = state.miners.map((miner) => ({ ...miner }))
  const nextHubs = state.hubs.map((hub) => ({ ...hub }))
  const nextInventory = { ...state.inventory }
  const nextMaterials = { ...state.materials }
  const nextUnlocked = { ...state.unlocked }
  const nextState: GameState = {
    belts: nextBelts,
    items: nextItems,
    oreDeposits: nextOreDeposits,
    miners: nextMiners,
    hubs: nextHubs,
    inventory: nextInventory,
    materials: nextMaterials,
    unlocked: nextUnlocked,
    storageBuildings: state.storageBuildings,
    terrain: state.terrain,
    bridgeSlots: state.bridgeSlots,
    bridges: state.bridges,
    valleySeed: state.valleySeed,
    nextId: state.nextId,
  }

  const beltById = new Map(nextBelts.map((belt) => [belt.id, belt]))
  const beltByCell = new Map(nextBelts.map((belt) => [cellKey(belt.x, belt.y), belt]))
  const hubCells = new Set(nextHubs.map((hub) => cellKey(hub.x, hub.y)))
  const depositByCell = new Map(nextOreDeposits.map((deposit) => [cellKey(deposit.x, deposit.y), deposit]))
  const occupiedBeltIds = new Set(nextItems.map((item) => item.beltId))

  const removedItemIds = new Set<string>()
  const advance = CELLS_PER_SECOND * dtSec

  for (const item of nextItems) {
    if (removedItemIds.has(item.id)) continue
    let currentBelt = beltById.get(item.beltId)
    if (!currentBelt) continue

    item.progress += advance

    while (item.progress >= 1) {
      const nextX = currentBelt.x + DX[currentBelt.dir]
      const nextY = currentBelt.y + DY[currentBelt.dir]
      const nextCell = cellKey(nextX, nextY)

      if (hubCells.has(nextCell)) {
        const accepted = addResourceToState(nextState, item.resource, 1)
        if (accepted > 0) {
          removedItemIds.add(item.id)
          occupiedBeltIds.delete(currentBelt.id)
          break
        }
        item.progress = 0.999
        break
      }

      if (currentBelt.buildId === 'splitter') {
        const selectedOutput = chooseSplitterOutput(currentBelt, beltByCell, occupiedBeltIds)
        if (selectedOutput) {
          const nextBelt = beltById.get(selectedOutput.beltId)
          if (!nextBelt) {
            item.progress = 0.999
            break
          }
          currentBelt.splitterNextOutputIndex = selectedOutput.nextOutputIndex
          occupiedBeltIds.delete(currentBelt.id)
          occupiedBeltIds.add(nextBelt.id)
          item.beltId = nextBelt.id
          item.progress -= 1
          currentBelt = nextBelt
          continue
        }
        item.progress = 0.999
        break
      }

      const nextBelt = beltByCell.get(nextCell)
      if (nextBelt && !occupiedBeltIds.has(nextBelt.id)) {
        if (nextBelt.buildId === 'splitter' && currentBelt.dir !== nextBelt.dir) {
          item.progress = 0.999
          break
        }
        occupiedBeltIds.delete(currentBelt.id)
        occupiedBeltIds.add(nextBelt.id)
        item.beltId = nextBelt.id
        item.progress -= 1
        currentBelt = nextBelt
        continue
      }

      item.progress = 0.999
      break
    }
  }

  if (removedItemIds.size > 0) {
    nextState.items = nextItems.filter((item) => !removedItemIds.has(item.id))
  } else {
    nextState.items = nextItems
  }

  for (const miner of nextMiners) {
    if (options.poweredMinerIds && !options.poweredMinerIds.has(miner.id)) {
      continue
    }
    miner.cooldownSec = Math.max(0, miner.cooldownSec - dtSec)
    if (miner.cooldownSec > 0) continue

    const oreDeposit = depositByCell.get(cellKey(miner.x, miner.y))
    if (!oreDeposit || oreDeposit.richness <= 0) continue
    miner.ore = oreDeposit.ore

    const outputX = miner.x + DX[miner.outputDir]
    const outputY = miner.y + DY[miner.outputDir]
    const outputBelt = beltByCell.get(cellKey(outputX, outputY))
    if (!outputBelt) continue
    if (occupiedBeltIds.has(outputBelt.id)) continue

    nextState.items.push({
      id: nextId(nextState),
      resource: miner.ore,
      beltId: outputBelt.id,
      progress: 0,
    })
    occupiedBeltIds.add(outputBelt.id)
    oreDeposit.richness = Math.max(0, oreDeposit.richness - 1)
    miner.cooldownSec = miner.cycleSec
  }

  return nextState
}
