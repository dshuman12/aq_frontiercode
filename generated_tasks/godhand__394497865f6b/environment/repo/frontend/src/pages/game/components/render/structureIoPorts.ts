import type { Direction } from '../../../../game/engine'
import { isDepotInputBuildId, isDepotOutputBuildId } from '../../../../game/engine/buildingCatalog'
import type { BuildId } from '../../buildCatalog'
import { getMachinePorts } from '../machineLayout'
import type { Point } from '../canvasMath'

export type IoPort = {
  kind: 'input' | 'output'
  side: Direction
  edgeX: number
  edgeY: number
}

type RecipeLike = {
  output: { material: string; amount: number }
  cost: Partial<Record<string, number>>
}

type Footprint = { width: number; height: number }

const OUTPUT_SIDE_BY_FACING: Record<Direction, Direction> = {
  up: 'up',
  right: 'right',
  down: 'down',
  left: 'left',
}

function portsAlongSide(
  anchor: Point,
  footprint: Footprint,
  side: Direction,
  kind: 'input' | 'output',
): IoPort[] {
  const ports: IoPort[] = []
  if (side === 'up' || side === 'down') {
    const edgeY = side === 'up' ? anchor.y : anchor.y + footprint.height
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      ports.push({
        kind,
        side,
        edgeX: anchor.x + offsetX + 0.5,
        edgeY,
      })
    }
    return ports
  }
  const edgeX = side === 'left' ? anchor.x : anchor.x + footprint.width
  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    ports.push({
      kind,
      side,
      edgeX,
      edgeY: anchor.y + offsetY + 0.5,
    })
  }
  return ports
}

export function getStructureIoPorts(
  anchor: Point,
  footprint: Footprint,
  buildId: BuildId,
  direction: Direction,
  recipe: RecipeLike | null,
): IoPort[] {
  if (isDepotInputBuildId(buildId)) {
    return [
      ...portsAlongSide(anchor, footprint, 'up', 'input'),
      ...portsAlongSide(anchor, footprint, 'right', 'input'),
      ...portsAlongSide(anchor, footprint, 'down', 'input'),
      ...portsAlongSide(anchor, footprint, 'left', 'input'),
    ]
  }

  if (isDepotOutputBuildId(buildId)) {
    const outputSide = OUTPUT_SIDE_BY_FACING[direction]
    return portsAlongSide(anchor, footprint, outputSide, 'output')
  }

  return getMachinePorts(anchor, buildId, direction, recipe)
}
