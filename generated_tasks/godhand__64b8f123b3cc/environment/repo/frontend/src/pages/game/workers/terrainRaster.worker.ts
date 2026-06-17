/// <reference lib="webworker" />

type TerrainCell = {
  x: number
  y: number
  valley: number
}

type TerrainChunkPayload = {
  key: string
  chunkX: number
  chunkY: number
  cells: TerrainCell[]
}

type BuildRequest = {
  type: 'build'
  buildId: number
  chunkSize: number
  tilePx: number
  chunks: TerrainChunkPayload[]
  palette: {
    accessible: Record<number, string>
    blocked: string
  }
}

type TerrainTilesetDefinition = {
  sourcePx: number
  accessible: Record<number, string[]>
  blocked: string[]
}

type SetTilesetRequest = {
  type: 'setTileset'
  definition: TerrainTilesetDefinition
}

type BuildDone = {
  type: 'done'
  buildId: number
}

type ChunkResult = {
  type: 'chunk'
  buildId: number
  key: string
  terrainCount: number
  bitmaps: [ImageBitmap, ImageBitmap, ImageBitmap, ImageBitmap]
}

let latestBuildId = 0
let terrainTileset: {
  sourcePx: number
  accessible: Record<number, ImageBitmap[]>
  blocked: ImageBitmap[]
} | null = null
let terrainTilesetLoadPromise: Promise<void> | null = null

function tileVariantIndex(x: number, y: number, length: number): number {
  if (length <= 1) return 0
  const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0
  return hash % length
}

function closeBitmapList(bitmaps: ImageBitmap[]): void {
  for (const bitmap of bitmaps) {
    bitmap.close()
  }
}

function closeTerrainTileset(): void {
  if (!terrainTileset) return
  closeBitmapList(terrainTileset.blocked)
  closeBitmapList(terrainTileset.accessible[1] ?? [])
  closeBitmapList(terrainTileset.accessible[2] ?? [])
  closeBitmapList(terrainTileset.accessible[3] ?? [])
  closeBitmapList(terrainTileset.accessible[4] ?? [])
  terrainTileset = null
}

async function loadImageBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }
    const blob = await response.blob()
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

async function loadBitmapList(urls: string[]): Promise<ImageBitmap[]> {
  const loaded = await Promise.all(urls.map((url) => loadImageBitmap(url)))
  return loaded.filter((bitmap): bitmap is ImageBitmap => bitmap !== null)
}

async function applyTerrainTilesetDefinition(definition: TerrainTilesetDefinition): Promise<void> {
  const accessible: Record<number, ImageBitmap[]> = { 1: [], 2: [], 3: [], 4: [] }
  for (const valley of [1, 2, 3, 4]) {
    accessible[valley] = await loadBitmapList(definition.accessible[valley] ?? [])
  }
  const blocked = await loadBitmapList(definition.blocked ?? [])
  const loadedCount =
    blocked.length + accessible[1].length + accessible[2].length + accessible[3].length + accessible[4].length

  closeTerrainTileset()
  if (loadedCount === 0) {
    terrainTileset = null
    return
  }

  terrainTileset = {
    sourcePx: definition.sourcePx,
    accessible,
    blocked,
  }
}

function pickTerrainSprite(x: number, y: number, valley: number): ImageBitmap | null {
  if (!terrainTileset) return null
  const variants =
    valley <= 0 ? terrainTileset.blocked : (terrainTileset.accessible[valley] ?? terrainTileset.accessible[1] ?? [])
  if (!variants || variants.length === 0) return null
  return variants[tileVariantIndex(x, y, variants.length)] ?? null
}

function renderChunkTierBitmap(
  chunk: TerrainChunkPayload,
  chunkSize: number,
  tilePx: number,
  tier: number,
  palette: BuildRequest['palette'],
): ImageBitmap {
  const canvas = new OffscreenCanvas(chunkSize * tilePx, chunkSize * tilePx)
  const ctx = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true,
  })
  if (!ctx) {
    throw new Error('Failed to initialize terrain raster canvas context.')
  }
  ctx.imageSmoothingEnabled = false
  for (const cell of chunk.cells) {
    const localX = cell.x - chunk.chunkX * chunkSize
    const localY = cell.y - chunk.chunkY * chunkSize
    if (localX < 0 || localX >= chunkSize || localY < 0 || localY >= chunkSize) continue
    const valley = cell.valley <= tier ? cell.valley : 0
    const sprite = pickTerrainSprite(cell.x, cell.y, valley)
    if (sprite) {
      ctx.drawImage(sprite, localX * tilePx, localY * tilePx, tilePx, tilePx)
      continue
    }
    const color = valley > 0 ? palette.accessible[valley] ?? palette.accessible[1] : palette.blocked
    ctx.fillStyle = color
    ctx.fillRect(localX * tilePx, localY * tilePx, tilePx, tilePx)
  }
  return canvas.transferToImageBitmap()
}

self.onmessage = async (event: MessageEvent<BuildRequest | SetTilesetRequest>) => {
  const message = event.data
  if (message.type === 'setTileset') {
    terrainTilesetLoadPromise = applyTerrainTilesetDefinition(message.definition)
    await terrainTilesetLoadPromise
    terrainTilesetLoadPromise = null
    return
  }

  if (message.type !== 'build') return
  if (terrainTilesetLoadPromise) {
    await terrainTilesetLoadPromise
  }
  latestBuildId = message.buildId

  for (const chunk of message.chunks) {
    if (message.buildId !== latestBuildId) return
    const bitmaps: [ImageBitmap, ImageBitmap, ImageBitmap, ImageBitmap] = [
      renderChunkTierBitmap(chunk, message.chunkSize, message.tilePx, 1, message.palette),
      renderChunkTierBitmap(chunk, message.chunkSize, message.tilePx, 2, message.palette),
      renderChunkTierBitmap(chunk, message.chunkSize, message.tilePx, 3, message.palette),
      renderChunkTierBitmap(chunk, message.chunkSize, message.tilePx, 4, message.palette),
    ]

    const result: ChunkResult = {
      type: 'chunk',
      buildId: message.buildId,
      key: chunk.key,
      terrainCount: chunk.cells.length,
      bitmaps,
    }
    self.postMessage(result, { transfer: bitmaps })
  }

  if (message.buildId !== latestBuildId) return
  const done: BuildDone = {
    type: 'done',
    buildId: message.buildId,
  }
  self.postMessage(done)
}
