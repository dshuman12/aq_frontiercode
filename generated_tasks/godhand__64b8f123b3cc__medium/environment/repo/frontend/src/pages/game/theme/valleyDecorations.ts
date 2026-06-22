import { closeBitmapList, loadBitmapList } from './spriteUtils'

export type ValleyDecorationType = 'tree' | 'rock' | 'flower'

export type ValleyDecorationDefinition = Record<ValleyDecorationType, string[]>

export type ValleyDecorationBitmaps = Record<ValleyDecorationType, ImageBitmap[]>

export type ValleyDecorationPick = {
  type: ValleyDecorationType
  bitmap: ImageBitmap
}

export const VALLEY_DECORATION_DEFINITION: ValleyDecorationDefinition = {
  tree: ['/src/assets/tree.png'],
  rock: ['/src/assets/rock1.png', '/src/assets/rock2.png'],
  flower: ['/src/assets/flowers1.png', '/src/assets/flowers2.png'],
}

export type BlockingValleyDecorationType = 'tree' | 'rock'

function hashCell(x: number, y: number, valley: number): number {
  return ((x * 73856093) ^ (y * 19349663) ^ (valley * 83492791)) >>> 0
}

function pickType(hash: number): ValleyDecorationType | null {
  const roll = (hash % 1000) / 1000
  if (roll < 0.011) return 'tree'
  if (roll < 0.018) return 'rock'
  if (roll < 0.22) return 'flower'
  return null
}

export function pickValleyDecorationType(x: number, y: number, valley: number): ValleyDecorationType | null {
  return pickType(hashCell(x, y, valley))
}

export function getBlockingValleyDecorationType(
  x: number,
  y: number,
  valley: number,
): BlockingValleyDecorationType | null {
  const type = pickValleyDecorationType(x, y, valley)
  return type === 'tree' || type === 'rock' ? type : null
}

export async function loadValleyDecorationBitmaps(
  definition: ValleyDecorationDefinition = VALLEY_DECORATION_DEFINITION,
): Promise<ValleyDecorationBitmaps | null> {
  const bitmaps: ValleyDecorationBitmaps = {
    tree: [],
    rock: [],
    flower: [],
  }

  bitmaps.tree = await loadBitmapList(definition.tree ?? [])
  bitmaps.rock = await loadBitmapList(definition.rock ?? [])
  bitmaps.flower = await loadBitmapList(definition.flower ?? [])

  const loadedCount = bitmaps.tree.length + bitmaps.rock.length + bitmaps.flower.length
  if (loadedCount === 0) return null
  return bitmaps
}

export function closeValleyDecorationBitmaps(bitmaps: ValleyDecorationBitmaps | null): void {
  if (!bitmaps) return
  closeBitmapList(bitmaps.tree)
  closeBitmapList(bitmaps.rock)
  closeBitmapList(bitmaps.flower)
}

export function pickValleyDecorationVariant(
  bitmaps: ValleyDecorationBitmaps | null,
  x: number,
  y: number,
  valley: number,
): ValleyDecorationPick | null {
  if (!bitmaps) return null
  const hash = hashCell(x, y, valley)
  const type = pickValleyDecorationType(x, y, valley)
  if (!type) return null
  const variants = bitmaps[type]
  if (!variants || variants.length === 0) return null
  const index = ((hash >>> 5) % variants.length) >>> 0
  const bitmap = variants[index]
  if (!bitmap) return null
  return {
    type,
    bitmap,
  }
}
