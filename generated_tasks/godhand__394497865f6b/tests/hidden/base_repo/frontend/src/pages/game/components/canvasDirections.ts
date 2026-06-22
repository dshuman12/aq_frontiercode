import type { Direction } from '../../../game/engine'

export const DX: Record<Direction, number> = { up: 0, right: 1, down: 0, left: -1 }
export const DY: Record<Direction, number> = { up: -1, right: 0, down: 1, left: 0 }

export const LEFT_OF: Record<Direction, Direction> = {
  up: 'left',
  right: 'up',
  down: 'right',
  left: 'down',
}

export const RIGHT_OF: Record<Direction, Direction> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
}
