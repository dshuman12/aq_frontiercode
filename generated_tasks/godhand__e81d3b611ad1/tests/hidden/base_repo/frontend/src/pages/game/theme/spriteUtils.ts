export type VariantHashOptions = {
  xMultiplier?: number
  yMultiplier?: number
}

export function pickVariantIndexByPosition(
  x: number,
  y: number,
  length: number,
  options: VariantHashOptions = {},
): number {
  if (length <= 1) return 0
  const xMultiplier = options.xMultiplier ?? 73856093
  const yMultiplier = options.yMultiplier ?? 19349663
  const hash = ((x * xMultiplier) ^ (y * yMultiplier)) >>> 0
  return hash % length
}

export function closeBitmapList(bitmaps: ImageBitmap[]): void {
  for (const bitmap of bitmaps) {
    bitmap.close()
  }
}

export async function loadImageBitmap(url: string): Promise<ImageBitmap | null> {
  if (typeof window === 'undefined') return null
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return await createImageBitmap(image)
  } catch {
    return null
  }
}

export async function loadBitmapList(urls: string[]): Promise<ImageBitmap[]> {
  const loaded = await Promise.all(urls.map((url) => loadImageBitmap(url)))
  return loaded.filter((bitmap): bitmap is ImageBitmap => bitmap !== null)
}
