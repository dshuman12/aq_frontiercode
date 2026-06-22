import { ORE_TYPES, type OreType } from '../../../game/engine'
import {
  closeBitmapList,
  loadBitmapList,
  pickVariantIndexByPosition,
} from './spriteUtils'

export type OreSpriteDefinition = Record<OreType, string[]>

export type OreSpriteBitmaps = Record<OreType, ImageBitmap[]>

export const ORE_SPRITE_DEFINITION: OreSpriteDefinition = {
  iron: ['/src/assets/silverore.png'],
  copper: ['/src/assets/copperore.png'],
  coal: ['/src/assets/coalore.png'],
  silica: ['/src/assets/silicaore.png'],
  aluminum: ['/src/assets/aluminumore.png'],
  titanium: ['/src/assets/titaniumore.png'],
  lithium: ['/src/assets/lithiumore.png'],
  tungsten: ['/src/assets/tungstenore.png'],
  thorium: ['/src/assets/thoriumore.png'],
}

export async function loadOreSpriteBitmaps(
  definition: OreSpriteDefinition = ORE_SPRITE_DEFINITION,
): Promise<OreSpriteBitmaps | null> {
  const bitmaps = {} as OreSpriteBitmaps
  let loadedCount = 0

  for (const ore of ORE_TYPES) {
    const variants = await loadBitmapList(definition[ore] ?? [])
    bitmaps[ore] = variants
    loadedCount += variants.length
  }

  if (loadedCount === 0) return null
  return bitmaps
}

export function closeOreSpriteBitmaps(bitmaps: OreSpriteBitmaps | null): void {
  if (!bitmaps) return
  for (const ore of ORE_TYPES) {
    closeBitmapList(bitmaps[ore] ?? [])
  }
}

export function pickOreSpriteVariant(
  bitmaps: OreSpriteBitmaps | null,
  ore: OreType,
  x: number,
  y: number,
): ImageBitmap | null {
  if (!bitmaps) return null
  const variants = bitmaps[ore]
  if (!variants || variants.length === 0) return null
  return variants[pickVariantIndexByPosition(x, y, variants.length)] ?? null
}
