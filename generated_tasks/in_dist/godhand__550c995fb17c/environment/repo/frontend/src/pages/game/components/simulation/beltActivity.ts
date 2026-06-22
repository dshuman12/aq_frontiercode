import type { Direction, GameState } from '../../../../game/engine'
import { toCellKey } from '../canvasMath'
import { DX, DY, LEFT_OF, RIGHT_OF } from '../canvasDirections'

type BeltEntity = GameState['belts'][number]
type ItemEntity = GameState['items'][number]

function outputDirsForBelt(belt: BeltEntity): Direction[] {
  return belt.buildId === 'splitter' ? [belt.dir, LEFT_OF[belt.dir], RIGHT_OF[belt.dir]] : [belt.dir]
}

function beltCanAcceptFromCell(belt: BeltEntity, sourceX: number, sourceY: number): boolean {
  if (belt.buildId === 'splitter') {
    return sourceX === belt.x - DX[belt.dir] && sourceY === belt.y - DY[belt.dir]
  }
  return true
}

export type BeltActivityState = {
  beltById: Map<string, BeltEntity>
  beltByCell: Map<string, BeltEntity>
  beltItemCounts: Map<string, number>
  pausedBeltIds: Set<string>
}

type ComputeBeltActivityOptions = {
  sinkCellKeys?: Set<string>
}

export function computeBeltActivityState(
  state: GameState,
  options: ComputeBeltActivityOptions = {},
): BeltActivityState {
  const beltById = new Map<string, BeltEntity>()
  const beltByCell = new Map<string, BeltEntity>()
  const beltItemCounts = new Map<string, number>()
  const leadingItemByBeltId = new Map<string, ItemEntity>()
  const pausedBeltIds = new Set<string>()
  const hubCellKeys = new Set(state.hubs.map((hub) => toCellKey(hub.x, hub.y)))
  const sinkCellKeys = options.sinkCellKeys ?? new Set<string>()

  for (const belt of state.belts) {
    beltById.set(belt.id, belt)
    beltByCell.set(toCellKey(belt.x, belt.y), belt)
  }

  for (const item of state.items) {
    beltItemCounts.set(item.beltId, (beltItemCounts.get(item.beltId) ?? 0) + 1)
    const existing = leadingItemByBeltId.get(item.beltId)
    if (!existing || item.progress > existing.progress) {
      leadingItemByBeltId.set(item.beltId, item)
    }
  }

  const outgoingByBeltId = new Map<string, Set<string>>()
  const incomingByBeltId = new Map<string, Set<string>>()
  for (const belt of state.belts) {
    outgoingByBeltId.set(belt.id, new Set())
    incomingByBeltId.set(belt.id, new Set())
  }
  for (const belt of state.belts) {
    const outputDirs = outputDirsForBelt(belt)
    for (const outputDir of outputDirs) {
      const nextX = belt.x + DX[outputDir]
      const nextY = belt.y + DY[outputDir]
      const nextBelt = beltByCell.get(toCellKey(nextX, nextY))
      if (!nextBelt) continue
      if (!beltCanAcceptFromCell(nextBelt, belt.x, belt.y)) continue
      outgoingByBeltId.get(belt.id)?.add(nextBelt.id)
      incomingByBeltId.get(nextBelt.id)?.add(belt.id)
    }
  }

  const hasUpstreamItemMemo = new Map<string, boolean>()
  const hasDownstreamOutputMemo = new Map<string, boolean>()
  const hasUpstreamItem = (beltId: string, inStack = new Set<string>()): boolean => {
    const memoized = hasUpstreamItemMemo.get(beltId)
    if (memoized !== undefined) return memoized
    if (inStack.has(beltId)) return false
    if ((beltItemCounts.get(beltId) ?? 0) > 0) {
      hasUpstreamItemMemo.set(beltId, true)
      return true
    }
    inStack.add(beltId)
    const incoming = incomingByBeltId.get(beltId)
    if (incoming) {
      for (const predecessorId of incoming) {
        if (hasUpstreamItem(predecessorId, inStack)) {
          inStack.delete(beltId)
          hasUpstreamItemMemo.set(beltId, true)
          return true
        }
      }
    }
    inStack.delete(beltId)
    hasUpstreamItemMemo.set(beltId, false)
    return false
  }
  const hasDownstreamOutput = (beltId: string, inStack = new Set<string>()): boolean => {
    const memoized = hasDownstreamOutputMemo.get(beltId)
    if (memoized !== undefined) return memoized
    if (inStack.has(beltId)) return false
    const belt = beltById.get(beltId)
    if (!belt) return false
    const outputDirs = outputDirsForBelt(belt)
    for (const outputDir of outputDirs) {
      const nextX = belt.x + DX[outputDir]
      const nextY = belt.y + DY[outputDir]
      if (hubCellKeys.has(toCellKey(nextX, nextY))) {
        hasDownstreamOutputMemo.set(beltId, true)
        return true
      }
      if (sinkCellKeys.has(toCellKey(nextX, nextY))) {
        hasDownstreamOutputMemo.set(beltId, true)
        return true
      }
    }
    inStack.add(beltId)
    const outgoing = outgoingByBeltId.get(beltId)
    if (outgoing) {
      for (const successorId of outgoing) {
        if (hasDownstreamOutput(successorId, inStack)) {
          inStack.delete(beltId)
          hasDownstreamOutputMemo.set(beltId, true)
          return true
        }
      }
    }
    inStack.delete(beltId)
    hasDownstreamOutputMemo.set(beltId, false)
    return false
  }

  const activeFlowBeltIds = new Set<string>()
  for (const belt of state.belts) {
    if (hasUpstreamItem(belt.id) && hasDownstreamOutput(belt.id)) {
      activeFlowBeltIds.add(belt.id)
    }
  }

  const occupiedBeltIds = new Set(leadingItemByBeltId.keys())

  for (const [beltId, leadItem] of leadingItemByBeltId.entries()) {
    if (leadItem.progress < 0.995) continue
    const belt = beltById.get(beltId)
    if (!belt) continue

    const outputDirs = outputDirsForBelt(belt)
    let hasFreeOutput = false
    for (const outputDir of outputDirs) {
      const nextX = belt.x + DX[outputDir]
      const nextY = belt.y + DY[outputDir]
      if (hubCellKeys.has(toCellKey(nextX, nextY))) {
        hasFreeOutput = true
        break
      }
      if (sinkCellKeys.has(toCellKey(nextX, nextY))) {
        hasFreeOutput = true
        break
      }
      const nextBelt = beltByCell.get(toCellKey(nextX, nextY))
      if (!nextBelt) continue
      if (!beltCanAcceptFromCell(nextBelt, belt.x, belt.y)) continue
      if (occupiedBeltIds.has(nextBelt.id)) continue
      hasFreeOutput = true
      break
    }
    if (!hasFreeOutput) {
      pausedBeltIds.add(beltId)
    }
  }

  for (const belt of state.belts) {
    if (beltItemCounts.get(belt.id)) continue
    if (!activeFlowBeltIds.has(belt.id)) {
      pausedBeltIds.add(belt.id)
    }
  }

  return {
    beltById,
    beltByCell,
    beltItemCounts,
    pausedBeltIds,
  }
}
