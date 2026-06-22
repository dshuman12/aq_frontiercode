export const BASE_CELL_SIZE = 24

export type Point = { x: number; y: number }

export type Camera = {
  scale: number
  offset: Point
}

export function screenToWorld(point: Point, camera: Camera): Point {
  return {
    x: (point.x - camera.offset.x) / camera.scale,
    y: (point.y - camera.offset.y) / camera.scale,
  }
}

export function worldToScreen(point: Point, camera: Camera): Point {
  return {
    x: point.x * camera.scale + camera.offset.x,
    y: point.y * camera.scale + camera.offset.y,
  }
}

export function worldToGrid(point: Point): Point {
  return {
    x: Math.floor(point.x / BASE_CELL_SIZE),
    y: Math.floor(point.y / BASE_CELL_SIZE),
  }
}

export function gridToWorld(point: Point): Point {
  return {
    x: point.x * BASE_CELL_SIZE,
    y: point.y * BASE_CELL_SIZE,
  }
}

export function toCellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function fromCellKey(key: string): Point {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}
