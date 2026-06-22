import type { Direction, GameState } from '../../../../game/engine'
import { BUILD_COLORS } from '../../buildCatalog'
import { type BuildingSpriteBitmaps, pickMinerSprite } from '../../theme/buildingSprites'
import { DX, DY } from '../canvasDirections'
import { gridToWorld, toCellKey, worldToScreen, type Camera } from '../canvasMath'
import { computeProducerPulseScale } from '../simulation/producerPulse'
import { drawDirectedSprite } from './spriteUtils'

type MinerEntity = GameState['miners'][number]
type BeltEntity = GameState['belts'][number]

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

export type MinerRenderStats = {
  drawCallsEstimateDelta: number
  visibleMinersDelta: number
  detailedMinerEffects: number
}

type RenderMinersParams = {
  ctx: CanvasRenderingContext2D
  state: GameState
  camera: Camera
  cellSize: number
  lowDetail: boolean
  veryLowDetail: boolean
  visualTimeSec: number
  oreRichnessByCell: Map<string, number>
  beltByCell: Map<string, BeltEntity>
  pausedBeltIds: Set<string>
  buildingSprites: BuildingSpriteBitmaps | null
  inView: (x: number, y: number) => boolean
  minerRotorRgb: string
  detailedMinerEffects: number
  maxDetailedMiners: number
  minerSpriteDirectionOffset: number
  minerActivePulseAmplitude: number
  minerActivePulseSpeed: number
}

export function renderMinersLayer(params: RenderMinersParams): MinerRenderStats {
  const {
    ctx,
    state,
    camera,
    cellSize,
    lowDetail,
    veryLowDetail,
    visualTimeSec,
    oreRichnessByCell,
    beltByCell,
    pausedBeltIds,
    buildingSprites,
    inView,
    minerRotorRgb,
    maxDetailedMiners,
    minerSpriteDirectionOffset,
    minerActivePulseAmplitude,
    minerActivePulseSpeed,
  } = params
  let detailedMinerEffects = params.detailedMinerEffects
  let drawCallsEstimateDelta = 0
  let visibleMinersDelta = 0

  for (const miner of state.miners) {
    if (!inView(miner.x, miner.y)) continue
    const minerCellKey = toCellKey(miner.x, miner.y)
    const outputCellKey = toCellKey(miner.x + DX[miner.outputDir], miner.y + DY[miner.outputDir])
    const outputBelt = beltByCell.get(outputCellKey)
    const outputPathActive = Boolean(outputBelt && !pausedBeltIds.has(outputBelt.id))
    const minerActive =
      miner.cooldownSec > 0 &&
      (oreRichnessByCell.get(minerCellKey) ?? 0) > 0 &&
      outputPathActive
    const minerPulseScale = computeProducerPulseScale({
      active: minerActive,
      cellSize,
      visualTimeSec,
      seedX: miner.x,
      seedY: miner.y,
      amplitude: minerActivePulseAmplitude,
      speed: minerActivePulseSpeed,
    })
    const minerSprite = pickMinerSprite(buildingSprites, miner.kind)
    if (minerSprite) {
      const screen = worldToScreen(gridToWorld({ x: miner.x, y: miner.y }), camera)
      ctx.imageSmoothingEnabled = false
      drawDirectedSprite(
        ctx,
        minerSprite,
        screen.x,
        screen.y,
        cellSize,
        cellSize,
        miner.outputDir,
        cellSize * minerPulseScale,
        cellSize * minerPulseScale,
        minerSpriteDirectionOffset,
      )
      ctx.imageSmoothingEnabled = true
      drawCallsEstimateDelta += 1
      visibleMinersDelta += 1
      continue
    }

    drawFallbackMiner(
      ctx,
      miner,
      camera,
      cellSize,
      lowDetail,
      veryLowDetail,
      visualTimeSec,
      minerPulseScale,
      minerRotorRgb,
      detailedMinerEffects < maxDetailedMiners,
    )
    drawCallsEstimateDelta += 1 + (!veryLowDetail ? 1 : 0)
    if (!lowDetail && detailedMinerEffects < maxDetailedMiners) {
      drawCallsEstimateDelta += 3
      detailedMinerEffects += 1
    }
    visibleMinersDelta += 1
  }

  return {
    drawCallsEstimateDelta,
    visibleMinersDelta,
    detailedMinerEffects,
  }
}

function drawFallbackMiner(
  ctx: CanvasRenderingContext2D,
  miner: MinerEntity,
  camera: Camera,
  cellSize: number,
  lowDetail: boolean,
  veryLowDetail: boolean,
  visualTimeSec: number,
  minerPulseScale: number,
  minerRotorRgb: string,
  allowDetailedMiner: boolean,
): void {
  const color = miner.kind === 'drill' ? BUILD_COLORS.drill : BUILD_COLORS.miner
  const spin = visualTimeSec * (miner.kind === 'drill' ? 7.1 : 3.6)
  const screen = worldToScreen(gridToWorld({ x: miner.x, y: miner.y }), camera)
  const centerX = screen.x + cellSize / 2
  const centerY = screen.y + cellSize / 2
  const bodySize = cellSize * 0.84 * minerPulseScale
  const bodyOffset = (cellSize - bodySize) * 0.5
  ctx.fillStyle = color.fill
  ctx.strokeStyle = color.stroke
  ctx.lineWidth = 3
  ctx.fillRect(screen.x + bodyOffset, screen.y + bodyOffset, bodySize, bodySize)
  if (!veryLowDetail) {
    ctx.strokeRect(screen.x + bodyOffset, screen.y + bodyOffset, bodySize, bodySize)
  }
  if (!lowDetail && allowDetailedMiner) {
    ctx.fillStyle = color.stroke
    drawDirectionArrow(ctx, centerX, centerY, miner.outputDir, cellSize * 0.28)
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(spin)
    ctx.fillStyle = `rgba(${minerRotorRgb}, 0.72)`
    ctx.fillRect(-cellSize * 0.05, -cellSize * 0.26, cellSize * 0.1, cellSize * 0.52)
    ctx.fillRect(-cellSize * 0.26, -cellSize * 0.05, cellSize * 0.52, cellSize * 0.1)
    ctx.restore()
  }
}
