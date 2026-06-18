import type { Direction } from '../../../../game/engine'
import { DX, DY, LEFT_OF, RIGHT_OF } from '../canvasDirections'

function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  dir: Direction,
  size: number,
): void {
  const dx = DX[dir]
  const dy = DY[dir]
  const tipX = centerX + dx * size
  const tipY = centerY + dy * size
  const leftX = centerX - dx * size * 0.4 + dy * size * 0.5
  const leftY = centerY - dy * size * 0.4 - dx * size * 0.5
  const rightX = centerX - dx * size * 0.4 - dy * size * 0.5
  const rightY = centerY - dy * size * 0.4 + dx * size * 0.5

  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(leftX, leftY)
  ctx.lineTo(rightX, rightY)
  ctx.closePath()
  ctx.fill()
}

function wrapToUnit(value: number): number {
  return value - Math.floor(value)
}

export function getBeltFlowPhase(
  timestampSec: number,
  x: number,
  y: number,
  dir: Direction,
  cellsPerSecond: number,
): number {
  const directionalCell = x * DX[dir] + y * DY[dir]
  return wrapToUnit(timestampSec * cellsPerSecond - directionalCell)
}

export function drawBeltDirectionGlyph(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  dir: Direction,
  size: number,
): void {
  ctx.fillStyle = 'rgba(22, 85, 127, 0.7)'
  drawDirectionArrow(ctx, centerX, centerY, dir, size * 0.72)
}

export function drawSplitterDirectionGlyph(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  dir: Direction,
  size: number,
): void {
  ctx.fillStyle = 'rgba(30, 74, 122, 0.76)'
  drawDirectionArrow(ctx, centerX, centerY, dir, size * 0.7)
  drawDirectionArrow(ctx, centerX, centerY, LEFT_OF[dir], size * 0.5)
  drawDirectionArrow(ctx, centerX, centerY, RIGHT_OF[dir], size * 0.5)
}

export function drawBeltFlowStrips(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  dir: Direction,
  cellSize: number,
  phase: number,
  flowRgb: string,
): void {
  const dirX = DX[dir]
  const dirY = DY[dir]
  const sideX = -dirY
  const sideY = dirX
  const halfLength = cellSize * 0.5
  const laneOffset = cellSize * 0.12
  const dashLen = Math.max(1.8, cellSize * 0.16)
  const dashGap = Math.max(1.4, cellSize * 0.09)
  const dashPeriod = dashLen + dashGap

  ctx.save()
  ctx.lineCap = 'round'
  ctx.setLineDash([dashLen, dashGap])
  ctx.lineDashOffset = -(phase * cellSize + dashPeriod * 0.5)
  ctx.lineWidth = Math.max(1, cellSize * 0.07)
  ctx.strokeStyle = `rgba(${flowRgb}, 0.72)`
  for (const lane of [-1, 1] as const) {
    const laneX = sideX * laneOffset * lane
    const laneY = sideY * laneOffset * lane
    ctx.beginPath()
    ctx.moveTo(centerX + dirX * -halfLength + laneX, centerY + dirY * -halfLength + laneY)
    ctx.lineTo(centerX + dirX * halfLength + laneX, centerY + dirY * halfLength + laneY)
    ctx.stroke()
  }
  ctx.restore()
}
