import {
  closeBitmapList,
  loadBitmapList,
} from './spriteUtils'

export type TerrainTilesetDefinition = {
  sourcePx: number
  accessible: Record<number, string[]>
  blocked: string[]
}

export type TerrainTilesetBitmaps = {
  sourcePx: number
  accessible: Record<number, ImageBitmap[]>
  blocked: ImageBitmap[]
}

export const TERRAIN_TILESET_DEFINITION: TerrainTilesetDefinition = {
  sourcePx: 24,
  accessible: {
    1: ['/src/assets/valley1.png'],
    2: ['/src/assets/valley1.png'],
    3: ['/src/assets/valley1.png'],
    4: ['/src/assets/valley1.png'],
  },
  blocked: ['/src/assets/blocked.png'],
}

export async function loadTerrainTilesetBitmaps(
  definition: TerrainTilesetDefinition = TERRAIN_TILESET_DEFINITION,
): Promise<TerrainTilesetBitmaps | null> {
  const accessible: Record<number, ImageBitmap[]> = { 1: [], 2: [], 3: [], 4: [] }

  for (const valley of [1, 2, 3, 4]) {
    const urls = definition.accessible[valley] ?? []
    accessible[valley] = await loadBitmapList(urls)
  }

  const blocked = await loadBitmapList(definition.blocked ?? [])
  const loadedCount =
    blocked.length + accessible[1].length + accessible[2].length + accessible[3].length + accessible[4].length

  if (loadedCount === 0) return null

  return {
    sourcePx: definition.sourcePx,
    accessible,
    blocked,
  }
}

export function closeTerrainTilesetBitmaps(tileset: TerrainTilesetBitmaps | null): void {
  if (!tileset) return
  closeBitmapList(tileset.blocked)
  closeBitmapList(tileset.accessible[1] ?? [])
  closeBitmapList(tileset.accessible[2] ?? [])
  closeBitmapList(tileset.accessible[3] ?? [])
  closeBitmapList(tileset.accessible[4] ?? [])
}

export function pickTerrainTilesetVariant(
  tileset: TerrainTilesetBitmaps | null,
  _x: number,
  _y: number,
  valley: number,
): ImageBitmap | null {
  if (!tileset) return null
  const variants = valley <= 0 ? tileset.blocked : (tileset.accessible[valley] ?? tileset.accessible[1] ?? [])
  if (!variants || variants.length === 0) return null
  return variants[0] ?? null
}
