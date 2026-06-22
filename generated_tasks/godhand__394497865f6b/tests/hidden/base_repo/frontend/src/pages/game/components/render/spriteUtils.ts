import type { Direction } from '../../../../game/engine'

function directionToAngle(direction: Direction): number {
  if (direction === 'up') return -Math.PI / 2
  if (direction === 'down') return Math.PI / 2
  if (direction === 'left') return Math.PI
  return 0
}

export function drawTiledDirectedSpriteAlongLocalY(
  ctx: CanvasRenderingContext2D,
  sprite: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  direction: Direction,
  tileWidth: number,
  tileHeight: number,
  tileCount: number,
): void {
  const centerX = x + width / 2
  const centerY = y + height / 2
  const clampedCount = Math.max(1, Math.floor(tileCount))
  const startOffsetY = -((clampedCount - 1) * tileHeight) / 2
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(directionToAngle(direction))
  for (let index = 0; index < clampedCount; index += 1) {
    const localY = startOffsetY + index * tileHeight
    ctx.drawImage(sprite, -tileWidth / 2, localY - tileHeight / 2, tileWidth, tileHeight)
  }
  ctx.restore()
}

export function drawDirectedSprite(
  ctx: CanvasRenderingContext2D,
  sprite: ImageBitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  direction: Direction,
  spriteWidth: number = width,
  spriteHeight: number = height,
  rotationOffsetRad: number = 0,
): void {
  const centerX = x + width / 2
  const centerY = y + height / 2
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(directionToAngle(direction) + rotationOffsetRad)
  ctx.drawImage(sprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight)
  ctx.restore()
}
