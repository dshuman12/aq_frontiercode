import type { Direction } from '../../../game/engine'
import {
  getBuildFootprint,
  isBuildDirectional,
  isProcessingBuildId as isProcessingBuildIdFromCatalog,
} from '../../../game/engine/buildingCatalog'
import type { BuildId } from '../buildCatalog'
import type { Point } from './canvasMath'

type RecipeLike = {
  output: { material: string; amount: number }
  cost: Partial<Record<string, number>>
}

export type StructureFootprint = {
  width: number
  height: number
}

export type MachinePort = {
  id: string
  kind: 'input' | 'output'
  side: Direction
  resource: string
  lane: number
  edgeX: number
  edgeY: number
  adjacentCell: Point
}

const OUTPUT_SIDE_BY_FACING: Record<Direction, Direction> = {
  up: 'up',
  right: 'right',
  down: 'down',
  left: 'left',
}

const INPUT_SIDE_BY_FACING: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
}

function isVerticalFacing(direction: Direction): boolean {
  return direction === 'up' || direction === 'down'
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
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
): { edgeX: number; edgeY: number; cellOffset: Point } {
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

export function isProcessingBuildId(buildId: BuildId): boolean {
  return isProcessingBuildIdFromCatalog(buildId)
}

export function getStructureFootprint(buildId: BuildId, direction: Direction): StructureFootprint {
  const base = getBuildFootprint(buildId)
  if (!isBuildDirectional(buildId) || !isVerticalFacing(direction)) return base
  return {
    width: base.height,
    height: base.width,
  }
}

export function getStructureCells(anchor: Point, buildId: BuildId, direction: Direction): Point[] {
  const footprint = getStructureFootprint(buildId, direction)
  const cells: Point[] = []
  for (let y = 0; y < footprint.height; y += 1) {
    for (let x = 0; x < footprint.width; x += 1) {
      cells.push({
        x: anchor.x + x,
        y: anchor.y + y,
      })
    }
  }
  return cells
}

export function getInputLaneCounts(recipe: RecipeLike | null): Record<string, number> {
  if (!recipe) return {}
  const counts: Record<string, number> = {}
  for (const [resource, amount] of Object.entries(recipe.cost)) {
    if (amount === undefined) continue
    counts[resource] = laneUnits(amount)
  }
  return counts
}

export function getMachinePorts(
  anchor: Point,
  buildId: BuildId,
  direction: Direction,
  recipe: RecipeLike | null,
): MachinePort[] {
  if (!isProcessingBuildId(buildId)) return []
  const footprint = getStructureFootprint(buildId, direction)

  const inputSide = INPUT_SIDE_BY_FACING[direction]
  const outputSide = OUTPUT_SIDE_BY_FACING[direction]
  const inputLanes = recipe ? laneResourcesForCost(recipe.cost) : ['input']
  const outputResource = recipe?.output.material ?? 'output'
  const outputLaneCount = recipe ? laneUnits(recipe.output.amount) : 1

  const ports: MachinePort[] = []
  for (let index = 0; index < inputLanes.length; index += 1) {
    const resource = inputLanes[index]
    const sidePos = resolveSidePosition(inputSide, index, inputLanes.length, footprint)
    ports.push({
      id: `in:${resource}:${index}`,
      kind: 'input',
      side: inputSide,
      resource,
      lane: index + 1,
      edgeX: anchor.x + sidePos.edgeX,
      edgeY: anchor.y + sidePos.edgeY,
      adjacentCell: {
        x: anchor.x + sidePos.cellOffset.x,
        y: anchor.y + sidePos.cellOffset.y,
      },
    })
  }

  for (let index = 0; index < outputLaneCount; index += 1) {
    const sidePos = resolveSidePosition(outputSide, index, outputLaneCount, footprint)
    ports.push({
      id: `out:${outputResource}:${index}`,
      kind: 'output',
      side: outputSide,
      resource: outputResource,
      lane: index + 1,
      edgeX: anchor.x + sidePos.edgeX,
      edgeY: anchor.y + sidePos.edgeY,
      adjacentCell: {
        x: anchor.x + sidePos.cellOffset.x,
        y: anchor.y + sidePos.cellOffset.y,
      },
    })
  }

  return ports
}
