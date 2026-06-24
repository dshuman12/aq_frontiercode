import { closeBitmapList, loadBitmapList } from './spriteUtils'

export type BuildingSpriteDefinition = {
  byBuildId: Record<string, string[]>
  conveyor: string[]
  miner: string[]
  drill: string[]
  hub: string[]
}

export type BuildingSpriteBitmaps = {
  byBuildId: Record<string, ImageBitmap[]>
  conveyor: ImageBitmap[]
  miner: ImageBitmap[]
  drill: ImageBitmap[]
  hub: ImageBitmap[]
}

export const BUILDING_SPRITE_DEFINITION: BuildingSpriteDefinition = {
  byBuildId: {
    splitter: ['/src/assets/splittertile.png'],
    storage: ['/src/assets/storagetile.png'],
    smelter: ['/src/assets/smeltertile.png'],
    generator: ['/src/assets/generatortile.png'],
    logistics_hub: ['/src/assets/logisticshubtile.png'],
  },
  conveyor: ['/src/assets/conveyortile.png'],
  miner: ['/src/assets/minertile.png'],
  drill: ['/src/assets/drilltile.png'],
  hub: ['/src/assets/logisticshubtile.png'],
}

export async function loadBuildingSpriteBitmaps(
  definition: BuildingSpriteDefinition = BUILDING_SPRITE_DEFINITION,
): Promise<BuildingSpriteBitmaps | null> {
  const byBuildId: Record<string, ImageBitmap[]> = {}
  let loadedCount = 0

  for (const [buildId, urls] of Object.entries(definition.byBuildId)) {
    const bitmaps = await loadBitmapList(urls ?? [])
    byBuildId[buildId] = bitmaps
    loadedCount += bitmaps.length
  }

  const conveyor = await loadBitmapList(definition.conveyor ?? [])
  const miner = await loadBitmapList(definition.miner ?? [])
  const drill = await loadBitmapList(definition.drill ?? [])
  const hub = await loadBitmapList(definition.hub ?? [])
  loadedCount += conveyor.length + miner.length + drill.length + hub.length

  if (loadedCount === 0) return null

  return {
    byBuildId,
    conveyor,
    miner,
    drill,
    hub,
  }
}

export function closeBuildingSpriteBitmaps(bitmaps: BuildingSpriteBitmaps | null): void {
  if (!bitmaps) return
  for (const variants of Object.values(bitmaps.byBuildId)) {
    closeBitmapList(variants)
  }
  closeBitmapList(bitmaps.conveyor)
  closeBitmapList(bitmaps.miner)
  closeBitmapList(bitmaps.drill)
  closeBitmapList(bitmaps.hub)
}

export function pickBuildingSpriteByBuildId(
  bitmaps: BuildingSpriteBitmaps | null,
  buildId: string,
): ImageBitmap | null {
  if (!bitmaps) return null
  const variants = bitmaps.byBuildId[buildId]
  if (!variants || variants.length === 0) return null
  return variants[0] ?? null
}

export function pickConveyorSprite(bitmaps: BuildingSpriteBitmaps | null): ImageBitmap | null {
  if (!bitmaps || bitmaps.conveyor.length === 0) return null
  return bitmaps.conveyor[0] ?? null
}

export function pickMinerSprite(bitmaps: BuildingSpriteBitmaps | null, kind: 'miner' | 'drill'): ImageBitmap | null {
  if (!bitmaps) return null
  const variants = kind === 'drill' ? bitmaps.drill : bitmaps.miner
  if (variants.length === 0) return null
  return variants[0] ?? null
}

export function pickHubSprite(bitmaps: BuildingSpriteBitmaps | null): ImageBitmap | null {
  if (!bitmaps || bitmaps.hub.length === 0) return null
  return bitmaps.hub[0] ?? null
}
